const { app, BrowserWindow, session, ipcMain, systemPreferences, desktopCapturer, utilityProcess } = require("electron");
const { spawn, fork } = require("child_process");
const path = require("path");
const net = require("net");
const { registerTranscriptionHandlers, registerModelHandlers } = require("./transcription");

const COMPACT_SIZE = { width: 500, height: 900 };
const EXPANDED_SIZE = { width: 1220, height: 900 };
const MINI_SIZE = { width: 320, height: 180 };

const FIXED_PORT = 14032;

let mainWindow;
let nextProcess;
let serverPort;
let isExpanded = false;
let isMini = false;
let preMiniBounds = null;

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

async function createWindow(port) {
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
    width: 500,
    height: 900,
    minWidth: 280,
    minHeight: 180,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
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

  // IPC handlers
  ipcMain.handle("toggle-expand", () => {
    if (!mainWindow) return false;
    isExpanded = !isExpanded;
    const size = isExpanded ? EXPANDED_SIZE : COMPACT_SIZE;
    const [currentX, currentY] = mainWindow.getPosition();
    mainWindow.setBounds({ x: currentX, y: currentY, ...size }, true);
    return isExpanded;
  });

  ipcMain.handle("get-expanded", () => isExpanded);

  ipcMain.handle("toggle-mini", () => {
    if (!mainWindow) return false;
    isMini = !isMini;
    if (isMini) {
      preMiniBounds = mainWindow.getBounds();
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
      mainWindow.setResizable(true);
      if (preMiniBounds) {
        mainWindow.setBounds(preMiniBounds, true);
        preMiniBounds = null;
      } else {
        const size = isExpanded ? EXPANDED_SIZE : COMPACT_SIZE;
        const [currentX, currentY] = mainWindow.getPosition();
        mainWindow.setBounds({ x: currentX, y: currentY, ...size }, true);
      }
    }
    return isMini;
  });

  ipcMain.handle("get-mini", () => isMini);

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

  registerTranscriptionHandlers();
  registerModelHandlers();

  serverPort = isDev ? await getFreePort() : FIXED_PORT;
  console.log(`Starting Next.js on port ${serverPort}...`);

  await createWindow(serverPort);

  await startNextServer(serverPort);
  await Promise.all([
    waitForServer(serverPort),
    requestMediaPermissions(),
  ]);

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
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
    if (!nextProcess) {
      serverPort = isDev ? await getFreePort() : FIXED_PORT;
      await createWindow(serverPort);
      await startNextServer(serverPort);
      await waitForServer(serverPort);
      mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
    } else {
      await createWindow(serverPort);
      mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
    }
  }
});
