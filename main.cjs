'use strict';
const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('node:path');
const { startServer } = require('./server.cjs');

app.setName('After You');
// Debugging is opt-in for local QA and disabled in ordinary and packaged launches.
if (!app.isPackaged && process.argv.includes('--inspect-ui')) {
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
  app.commandLine.appendSwitch('remote-debugging-port', '0');
}
let localServer;
let window;
function openWindow() {
  const home = `${localServer.origin}/`;
  window = new BrowserWindow({
    width: 1440, height: 960, minWidth: 1000, minHeight: 700,
    title: 'After You', backgroundColor: '#ebe7dc',
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 20 },
    show: false, icon: path.join(__dirname, 'assets/app-icon.png'),
    webPreferences: {
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true, allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (url !== home) event.preventDefault(); });
  window.webContents.on('will-frame-navigate', (event) => { if (event.url !== home) event.preventDefault(); });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { window = null; });
  void window.loadURL(home).catch((error) => { console.error('Unable to open After You:', error.message); app.quit(); });
}
app.whenReady().then(async () => {
  localServer = await startServer();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, reply) => reply(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((details, reply) => {
    reply({ cancel: !details.url.startsWith(`${localServer.origin}/`) });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'After You', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }] },
  ]));
  if (process.platform === 'darwin' && !app.isPackaged) app.dock.setIcon(path.join(__dirname, 'assets/app-icon.png'));
  openWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) openWindow(); });
}).catch((error) => { console.error('After You failed to start:', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { localServer?.server.close(); });
