const { app, BrowserWindow, session, ipcMain, systemPreferences, desktopCapturer, utilityProcess } = require("electron");
const { spawn, fork } = require("child_process");
const path = require("path");
const net = require("net");
const { registerTranscriptionHandlers } = require("./transcription");

const COMPACT_SIZE = { width: 500, height: 900 };
const EXPANDED_SIZE = { width: 1220, height: 900 };
const MINI_SIZE = { width: 320, height: 180 };

let mainWindow;
let nextProcess;
let serverPort;
let isExpanded = false;
let isMini = false;
let preMiniBounds = null;

const isDev = !app.isPackaged;

// Find a free port so we don't collide with anything
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
  let serverPath, args, cwd;

  if (isDev) {
    cwd = path.join(__dirname, "..");
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

async function createWindow(port) {
  // Chromium does a permission CHECK before a permission REQUEST.
  // Without the check handler returning true, getUserMedia is denied
  // before the request handler is ever called.
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
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // IPC: toggle between compact and expanded window sizes
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
      const { screen } = require("electron");
      const display = screen.getDisplayNearestPoint(
        screen.getCursorScreenPoint()
      );
      const { width: screenW } = display.workArea;
      const x = Math.round(display.workArea.x + (screenW - MINI_SIZE.width) / 2);
      const y = display.workArea.y + 8;
      mainWindow.setBounds({ x, y, ...MINI_SIZE }, true);
    } else {
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

  // IPC: adjust window width by a delta (used for side dock extend/collapse)
  ipcMain.handle("adjust-width", (_event, delta) => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    mainWindow.setBounds({ x, y, width: w + delta, height: h }, true);
  });

  // Enable getDisplayMedia() in the renderer with the native macOS picker
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      callback({ video: mainWindow, audio: "loopback" });
    },
    { useSystemPicker: true }
  );

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/presentation-popout')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 960,
          height: 540,
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 12, y: 12 },
          backgroundColor: '#000000',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }
    return { action: 'deny' };
  });

  // Show a minimal loading screen while Next.js starts up
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; }
  body {
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: #fff;
    -webkit-app-region: drag;
    user-select: none;
  }
  .loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: rgba(255,255,255,0.6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .text {
    font-size: 13px;
    font-weight: 400;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.02em;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <div class="text">Starting Fuse</div>
  </div>
</body>
</html>
  `)}`);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  registerTranscriptionHandlers();

  serverPort = await getFreePort();
  console.log(`Starting Next.js on port ${serverPort}...`);

  // Show the window immediately with a loading screen so the user
  // isn't staring at nothing while Next.js cold-starts
  await createWindow(serverPort);

  // Start the server and request media permissions in parallel.
  // Media permissions cause OS dialogs but aren't needed until
  // the user actually joins a call.
  await startNextServer(serverPort);
  await Promise.all([
    waitForServer(serverPort),
    requestMediaPermissions(),
  ]);

  // Server is ready, load the app
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
  // macOS dock click re-opens window
  if (mainWindow === null) {
    if (!nextProcess) {
      serverPort = await getFreePort();
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
