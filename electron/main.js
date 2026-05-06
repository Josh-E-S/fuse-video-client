// Electron main process. Owns the desktop window, native OS integrations
// (camera/mic permissions, sleep/wake, system dialogs), and the IPC contract
// the renderer uses for window-mode controls and AI workers.
//
// Layout:
//   1. Constants & helpers (sizes, port utilities)
//   2. Window-mode IPC handlers (registered once at app ready)
//   3. createWindow — security setup + window creation
//   4. App lifecycle (whenReady, window-all-closed, activate)

const { app, BrowserWindow, session, ipcMain, systemPreferences, powerMonitor, dialog } = require("electron");
const { spawn, fork } = require("child_process");
const path = require("path");
const net = require("net");
const { registerTranscriptionHandlers, registerModelHandlers } = require("./transcription");
const { registerSummarizerHandlers, registerSummarizerModelHandlers } = require("./summarizer");

// Window size matrix — keyed by (expanded, sideDockOpen).
// Uniform height (941) across all non-mini states so mode toggles never jump vertically.
// At this height, expanded video area ≈ 1200x675 = true 16:9; collapsed ≈ 510x675 stays portrait.
const SIDE_DOCK_WIDTH = 336;
const COLLAPSED_SIZE = { width: 510, height: 941 };
const EXPANDED_SIZE = { width: 1224, height: 941 };
const MINI_SIZE = { width: 640, height: 360 };
const SIDEBAR_WIDTH = 300;

function getTargetSize(expanded, sideDockOpen) {
  const base = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
  return {
    width: base.width + (sideDockOpen ? SIDE_DOCK_WIDTH : 0),
    height: base.height,
  };
}

function getSidebarBounds() {
  const { screen } = require("electron");
  const display = screen.getPrimaryDisplay();
  const { x, y, height } = display.workArea;
  return { x, y, width: SIDEBAR_WIDTH, height };
}

const FIXED_PORT = 14032;

let mainWindow;
let nextProcess;
let serverPort;
let isExpanded = false;
let isMini = false;
let isSidebar = false;
let sideDockOpen = false;
// Records the mode in effect before mini was entered, so exiting mini can
// restore it. Shape: { kind: 'sidebar' } or { kind: 'normal', bounds: <Rectangle> }.
let preMiniMode = null;
let preSidebarBounds = null;
let preSidebarExpanded = false;

const isDev = !app.isPackaged;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function getPortWithFallback(preferred) {
  if (await isPortFree(preferred)) return preferred;
  console.warn(`Port ${preferred} in use, falling back to a free port`);
  return getFreePort();
}

function waitForServer(port, retries = 60) {
  return new Promise((resolve, reject) => {
    const tryConnect = (attempt) => {
      if (attempt >= retries) {
        return reject(new Error("Next.js server did not start in time"));
      }
      const socket = new net.Socket();
      socket
        .once("connect", () => {
          socket.destroy();
          resolve();
        })
        .once("error", () => {
          setTimeout(() => tryConnect(attempt + 1), 500);
        })
        .connect(port, "127.0.0.1");
    };
    tryConnect(0);
  });
}

async function startNextServer(port) {
  if (isDev) {
    const cwd = path.join(__dirname, "..");
    const nextBin = path.join(cwd, "node_modules", ".bin", "next");
    nextProcess = spawn(nextBin, ["dev", "--port", String(port)], {
      cwd,
      env: { ...process.env, PORT: String(port) },
      stdio: "pipe",
    });
  } else {
    const unpackedPath = app.getAppPath().replace("app.asar", "app.asar.unpacked");
    const serverScript = path.join(unpackedPath, ".next", "standalone", "server.js");
    nextProcess = fork(serverScript, [], {
      cwd: unpackedPath,
      env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" },
      stdio: "pipe",
    });
  }

  nextProcess.stdout.on("data", (data) => {
    console.log(`[next] ${data.toString().trim()}`);
  });

  nextProcess.stderr.on("data", (data) => {
    console.error(`[next] ${data.toString().trim()}`);
  });

  nextProcess.on("close", (code) => {
    console.log(`Next.js exited with code ${code}`);
  });
}

async function requestMediaPermissions() {
  if (process.platform === "darwin") {
    await systemPreferences.askForMediaAccess("camera");
    await systemPreferences.askForMediaAccess("microphone");
  }
}

function getAllowedOrigin() {
  return `http://127.0.0.1:${serverPort}`;
}

// Window-mode IPC. Registered once at app ready, not per-window — re-registering
// the same channel name throws, and the activate handler can recreate the window.
// All handlers operate on the module-scoped mainWindow + mode flags.
function registerWindowIpc() {
  ipcMain.handle("toggle-expand", () => {
    if (!mainWindow) return false;
    // Manual mid-call resize cancels any auto-restore-to-sidebar intent.
    preSidebarBounds = null;
    if (isSidebar) {
      isSidebar = false;
    }
    isExpanded = !isExpanded;
    const [currentX, currentY] = mainWindow.getPosition();
    mainWindow.setBounds({ x: currentX, y: currentY, ...getTargetSize(isExpanded, sideDockOpen) }, true);
    return isExpanded;
  });

  ipcMain.handle("get-expanded", () => isExpanded);

  ipcMain.handle("toggle-mini", () => {
    if (!mainWindow) return { isMini: false, isSidebar };
    if (!isMini) {
      // Entering mini — remember the mode we came from so exit can restore it.
      preMiniMode = isSidebar
        ? { kind: "sidebar" }
        : { kind: "normal", bounds: mainWindow.getBounds() };
      isSidebar = false;
      isMini = true;
      mainWindow.setResizable(false);
      const { screen } = require("electron");
      const display = screen.getDisplayNearestPoint(
        screen.getCursorScreenPoint()
      );
      const { width: screenW } = display.workArea;
      const x = Math.round(display.workArea.x + (screenW - MINI_SIZE.width) / 2);
      const y = display.workArea.y + 8;
      mainWindow.setBounds({ x, y, ...MINI_SIZE }, true);
    } else {
      // Exiting mini — restore the previous mode.
      isMini = false;
      mainWindow.setResizable(true);
      if (preMiniMode && preMiniMode.kind === "sidebar") {
        isSidebar = true;
        mainWindow.setBounds(getSidebarBounds(), true);
      } else if (preMiniMode && preMiniMode.kind === "normal") {
        mainWindow.setBounds(preMiniMode.bounds, true);
      } else {
        const [currentX, currentY] = mainWindow.getPosition();
        mainWindow.setBounds({ x: currentX, y: currentY, ...getTargetSize(isExpanded, sideDockOpen) }, true);
      }
      preMiniMode = null;
    }
    return { isMini, isSidebar };
  });

  ipcMain.handle("get-mini", () => isMini);

  // Mini-mode-only width tweak. Used by MiniModeView to slide the
  // transcript panel in/out (±640px). All other window resizes
  // (expanded toggle, side dock open/close) go through resize-to-state.
  ipcMain.handle("adjust-width", (_event, delta) => {
    if (!mainWindow) return;
    if (typeof delta !== "number" || !Number.isFinite(delta) || Math.abs(delta) > 1000) {
      console.warn(`Rejected invalid adjust-width delta: ${delta}`);
      return;
    }
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    mainWindow.setBounds({ x, y, width: w + delta, height: h }, true);
  });

  // Resize the window to one of the four fixed sizes from the size matrix
  // (collapsed/expanded × dock closed/open). The renderer tells us its
  // intended mode + dock state; we update our tracking variables and
  // resize. Main owns the state — the renderer doesn't track sizes itself.
  ipcMain.handle("resize-to-state", (_event, state) => {
    if (!mainWindow) return;
    if (!state || typeof state !== "object") {
      console.warn("Rejected invalid resize-to-state payload:", state);
      return;
    }
    const nextExpanded = typeof state.expanded === "boolean" ? state.expanded : isExpanded;
    const nextSideDockOpen = typeof state.sideDockOpen === "boolean" ? state.sideDockOpen : sideDockOpen;
    isExpanded = nextExpanded;
    sideDockOpen = nextSideDockOpen;
    // Don't resize while in sidebar/mini — those modes own their own bounds.
    if (isMini || isSidebar) return;
    const [currentX, currentY] = mainWindow.getPosition();
    mainWindow.setBounds({ x: currentX, y: currentY, ...getTargetSize(isExpanded, sideDockOpen) }, true);
  });

  ipcMain.handle("toggle-sidebar", () => {
    if (!mainWindow) return false;
    if (!isSidebar) {
      // Entering sidebar — snapshot current bounds + expanded flag for later restore.
      // If we're coming from mini, re-enable resize first; mini disabled it.
      preSidebarBounds = isMini ? null : mainWindow.getBounds();
      preSidebarExpanded = isExpanded;
      isSidebar = true;
      isMini = false;
      mainWindow.setResizable(true);
      mainWindow.setBounds(getSidebarBounds(), true);
    } else {
      // Exiting sidebar — restore previous bounds (or fall back to canonical size).
      isSidebar = false;
      if (preSidebarBounds) {
        mainWindow.setBounds(preSidebarBounds, true);
        preSidebarBounds = null;
      } else {
        isExpanded = preSidebarExpanded;
        const [currentX, currentY] = mainWindow.getPosition();
        mainWindow.setBounds({ x: currentX, y: currentY, ...getTargetSize(isExpanded, sideDockOpen) }, true);
      }
    }
    return isSidebar;
  });

  ipcMain.handle("get-sidebar", () => isSidebar);

  // Promote out of sidebar (for an incoming/outgoing call). Remembers we came from
  // sidebar so the matching restore-sidebar handler can put us back when the call ends.
  ipcMain.handle("promote-from-sidebar", () => {
    if (!mainWindow || !isSidebar) return false;
    isSidebar = false;
    isExpanded = preSidebarExpanded;
    if (preSidebarBounds) {
      mainWindow.setBounds(preSidebarBounds, true);
    } else {
      const [currentX, currentY] = mainWindow.getPosition();
      mainWindow.setBounds({ x: currentX, y: currentY, ...getTargetSize(isExpanded, sideDockOpen) }, true);
    }
    return true;
  });

  ipcMain.handle("restore-sidebar", () => {
    if (!mainWindow) return false;
    if (isSidebar) return true;
    if (!preSidebarBounds) return false;
    isSidebar = true;
    isMini = false;
    mainWindow.setBounds(getSidebarBounds(), true);
    return true;
  });
}

async function createWindow() {
  const allowedPermissions = new Set([
    "media",
    "camera",
    "microphone",
    "display-capture",
    "mediaKeySystem",
    "notifications",
  ]);

  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => {
      return allowedPermissions.has(permission);
    }
  );

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(allowedPermissions.has(permission));
    }
  );

  // CSP: Next.js requires unsafe-inline + unsafe-eval for inline scripts and HMR.
  // PexRTC is loaded from the user's configured Pexip node (any https domain).
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https: ${getAllowedOrigin()}`,
    `style-src 'self' 'unsafe-inline' ${getAllowedOrigin()}`,
    `img-src 'self' data: blob: ${getAllowedOrigin()}`,
    `media-src 'self' blob: mediastream: ${getAllowedOrigin()}`,
    `connect-src 'self' https: wss: ${getAllowedOrigin()} ${isDev ? 'ws://127.0.0.1:*' : ''}`,
    `font-src 'self' data: ${getAllowedOrigin()}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  // Strip Origin header on outbound requests to external HTTPS domains.
  // PexRTC and the registration API make cross-origin requests from the local
  // Next.js server. Removing the Origin header prevents the Pexip server from
  // treating these as CORS requests, avoiding preflight failures.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url);
    if (url.protocol === "https:" && url.hostname !== "127.0.0.1") {
      delete details.requestHeaders["Origin"];
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  // Inject CSP on local server responses and CORS headers on external responses.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    if (details.url.startsWith(getAllowedOrigin())) {
      responseHeaders["Content-Security-Policy"] = [cspDirectives];
    }

    const url = new URL(details.url);
    if (url.protocol === "https:" && url.hostname !== "127.0.0.1") {
      responseHeaders["Access-Control-Allow-Origin"] = [getAllowedOrigin()];
      responseHeaders["Access-Control-Allow-Headers"] = ["*"];
      responseHeaders["Access-Control-Allow-Methods"] = ["GET, POST, OPTIONS"];
    }

    callback({ responseHeaders });
  });

  mainWindow = new BrowserWindow({
    width: COLLAPSED_SIZE.width,
    height: COLLAPSED_SIZE.height,
    minWidth: 280,
    minHeight: 180,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    // Floats above other apps so an incoming call is never hidden behind a
    // full-screen window. Standard for video calling clients.
    alwaysOnTop: true,
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Navigation guard: only allow our local server
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = getAllowedOrigin();
    if (!url.startsWith(allowed) && !url.startsWith("file://")) {
      event.preventDefault();
      console.warn(`Blocked navigation to: ${url}`);
    }
  });

  // Window open handler: only allow presentation popout
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes("/presentation-popout")) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 960,
          height: 540,
          titleBarStyle: "hiddenInset",
          trafficLightPosition: { x: 12, y: 12 },
          backgroundColor: "#000000",
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
          },
        },
      };
    }
    console.warn(`Blocked window open: ${url}`);
    return { action: "deny" };
  });

  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      callback({ video: mainWindow, audio: "loopback" });
    },
    { useSystemPicker: true }
  );

  mainWindow.loadFile(path.join(__dirname, "splash.html"));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Block <webview> tags from being created
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event) => {
      event.preventDefault();
    });
  });

  // Register IPC handlers once at app ready. The window-mode handlers reference
  // mainWindow lazily so it's fine that the window doesn't exist yet.
  registerWindowIpc();
  registerTranscriptionHandlers();
  registerModelHandlers();
  registerSummarizerHandlers();
  registerSummarizerModelHandlers();

  // Notify renderer when the OS resumes from sleep or the screen is unlocked,
  // so it can re-establish the Pexip registration after suspend kills its socket.
  const sendPowerResume = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("power:resume");
    }
  };
  powerMonitor.on("resume", sendPowerResume);
  powerMonitor.on("unlock-screen", sendPowerResume);

  serverPort = isDev ? await getFreePort() : await getPortWithFallback(FIXED_PORT);
  console.log(`Starting Next.js on port ${serverPort}...`);

  await createWindow();

  try {
    await startNextServer(serverPort);
    await Promise.all([
      waitForServer(serverPort),
      requestMediaPermissions(),
    ]);
    mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
  } catch (err) {
    console.error("Startup failed:", err);
    dialog.showErrorBox(
      "Fuse Video Client failed to start",
      `${err.message}\n\nPlease quit and try again. If the problem persists, restart your computer.`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (nextProcess) {
    nextProcess.kill();
  }
  app.quit();
});

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});

app.on("activate", async () => {
  if (mainWindow === null) {
    try {
      if (!nextProcess) {
        serverPort = isDev ? await getFreePort() : await getPortWithFallback(FIXED_PORT);
        await createWindow();
        await startNextServer(serverPort);
        await waitForServer(serverPort);
        mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
      } else {
        await createWindow();
        mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
      }
    } catch (err) {
      console.error("Re-activation failed:", err);
      dialog.showErrorBox(
        "Fuse Video Client failed to reopen",
        `${err.message}\n\nPlease quit and try again.`
      );
      app.quit();
    }
  }
});
