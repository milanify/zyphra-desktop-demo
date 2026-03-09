const { app, BrowserWindow, BrowserView } = require('electron');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
  });

  const SIDEBAR_WIDTH = 320;

  // Website view
  const siteView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // React sidebar
  const sidebarView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setBrowserView(siteView);
  mainWindow.addBrowserView(sidebarView);

  const resizeViews = () => {
    const [width, height] = mainWindow.getContentSize();

    // Website takes remaining space
    siteView.setBounds({
      x: 0,
      y: 0,
      width: width - SIDEBAR_WIDTH,
      height: height,
    });

    // Sidebar on right
    sidebarView.setBounds({
      x: width - SIDEBAR_WIDTH,
      y: 0,
      width: SIDEBAR_WIDTH,
      height: height,
    });
  };

  resizeViews();

  mainWindow.on('resize', resizeViews);

  // Load content
  siteView.webContents.loadURL("https://playground.zyphra.com/chat");
  sidebarView.webContents.loadURL("http://localhost:5173");

  // Optional debugging
  // siteView.webContents.openDevTools();
  // sidebarView.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});