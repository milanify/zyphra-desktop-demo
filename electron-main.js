// electron-main.js
const { app, BrowserWindow, BrowserView } = require('electron');
const path = require('path');

function createWindow() {
  // Main window
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,      // allows React sidebar in BrowserView
      contextIsolation: false,    // keep false for simplicity
    },
  });

  // Sidebar as a BrowserView
  const sidebar = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setBrowserView(sidebar);

  // Position and size the sidebar (right-hand side)
  sidebar.setBounds({
    x: 980,       // main window width (1280) - sidebar width (300)
    y: 0,
    width: 300,
    height: 800,
  });

  // Load your React app in the sidebar
  sidebar.webContents.loadURL('http://localhost:5173'); // dev server

  // Load Zyphra Chat in main window
  mainWindow.loadURL('https://playground.zyphra.com/chat');

  // Optional: open dev tools for debugging
  // mainWindow.webContents.openDevTools();
  // sidebar.webContents.openDevTools();
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});