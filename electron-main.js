const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // allows React sidebar to interact
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // React dev server
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html')); // production build
  }

  // Open dev tools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Optional: open Zyphra Chat in a separate BrowserWindow inside Electron
  const chatWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false, // important for security
      contextIsolation: true,
    },
  });
  chatWindow.loadURL('https://playground.zyphra.com/chat');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});