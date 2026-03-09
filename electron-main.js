/* eslint-env node */
/* global __dirname, process, require */
const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
  });

  const SIDEBAR_WIDTH = 320;

  /** @type {import('electron').BrowserView | null} */
  let siteView = null;
  /** @type {import('electron').BrowserView | null} */
  let sidebarView = null;

  // Website view
  siteView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // React sidebar
  sidebarView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "electron-preload.js"),
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

  // -------------------------
  // IPC: Sidebar <-> Main
  // -------------------------

  const emitTimeline = (payload) => {
    try {
      if (!sidebarView?.webContents) return;
      sidebarView.webContents.send("agent:timeline", {
        ts: Date.now(),
        ...payload,
      });
    } catch {
      // noop (demo app)
    }
  };

  const zyphraExec = async (js) => {
    if (!siteView?.webContents) throw new Error("siteView not ready");
    return await siteView.webContents.executeJavaScript(js, true);
  };

  const zyphraSetDraft = async ({ text, mode }) => {
    const safeText = String(text ?? "");
    const safeMode = mode === "append" ? "append" : "replace";

    return await zyphraExec(`(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const ta = textareas.find(isVisible) || textareas[0];
      if (!ta) return { ok: false, error: 'No <textarea> found' };

      const prev = ta.value ?? '';
      const next = ${JSON.stringify(safeMode)} === 'append' ? (prev + ${JSON.stringify(safeText)}) : ${JSON.stringify(safeText)};
      ta.focus();
      ta.value = next;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, length: next.length };
    })()`);
  };

  const zyphraSubmit = async () => {
    return await zyphraExec(`(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const ta = textareas.find(isVisible) || textareas[0];
      if (!ta) return { ok: false, error: 'No <textarea> found' };

      // Prefer a submit button in the same form/container.
      const root = ta.closest('form') || ta.parentElement;
      const candidates = Array.from((root || document).querySelectorAll('button'));
      const btn =
        candidates.find(b => isVisible(b) && (b.type === 'submit')) ||
        candidates.find(b => isVisible(b) && /send|submit|run|go/i.test((b.textContent || '').trim())) ||
        candidates.find(b => isVisible(b));

      if (btn) {
        btn.click();
        return { ok: true, via: 'button' };
      }

      // Fallback: Enter key.
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
      return { ok: true, via: 'enter' };
    })()`);
  };

  ipcMain.handle("zyphra:setDraft", async (_evt, args) => {
    emitTimeline({ kind: "step", source: args?.source || "unknown", message: "Setting Zyphra draft…" });
    return await zyphraSetDraft({ text: args?.text, mode: args?.mode });
  });

  ipcMain.handle("zyphra:submit", async (_evt, args) => {
    emitTimeline({ kind: "step", source: args?.source || "unknown", message: "Submitting to Zyphra…" });
    return await zyphraSubmit();
  });

  ipcMain.handle("dialog:openFile", async (_evt, args) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: "Select a file",
      properties: ["openFile"],
      filters: args?.filters || undefined,
    });
    if (res.canceled || !res.filePaths?.[0]) return { canceled: true };
    return { canceled: false, path: res.filePaths[0] };
  });

  ipcMain.handle("fs:readFile", async (_evt, args) => {
    const filePath = String(args?.path || "");
    emitTimeline({ kind: "step", source: args?.source || "unknown", message: `Reading file: ${path.basename(filePath)}` });
    const buf = await fs.readFile(filePath);
    // Best-effort text decode; for demo, we keep it simple.
    const text = buf.toString("utf8");
    return { path: filePath, text };
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});