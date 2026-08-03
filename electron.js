const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function startServer() {
  return new Promise((resolve) => {
    delete require.cache[require.resolve('./server')];
    const srv = require('./server');
    srv.start().then(() => {
      const http = require('http');
      function check() {
        const req = http.get('http://localhost:3002', () => { resolve(); });
        req.on('error', () => setTimeout(check, 300));
        req.setTimeout(1000, () => { req.destroy(); setTimeout(check, 300); });
      }
      check();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadURL('http://localhost:3002');

  mainWindow.once('ready-to-show', () => { mainWindow.show(); });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
