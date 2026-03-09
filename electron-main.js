/* eslint-env node */
/* global __dirname, process, require */
const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const pdfParse = require("pdf-parse");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
  });

  const SIDEBAR_WIDTH = 360;

  /** @type {import('electron').BrowserView | null} */
  let siteView = null;
  /** @type {import('electron').BrowserView | null} */
  let sidebarView = null;

  // Website view
  siteView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  // React sidebar
  sidebarView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "electron-preload.js"),
      devTools: true,
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
      const ta =
        document.querySelector('textarea[placeholder*="Ask"]') ||
        textareas.find(t => (t.getAttribute('placeholder') || '').toLowerCase().includes('ask')) ||
        textareas.find(isVisible) ||
        textareas[0];
      if (!ta) return { ok: false, error: 'No <textarea> found' };

      const prev = ta.value ?? '';
      const next = ${JSON.stringify(safeMode)} === 'append' ? (prev + ${JSON.stringify(safeText)}) : ${JSON.stringify(safeText)};

      // IMPORTANT: Use the native value setter so React-controlled inputs update correctly.
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      ta.focus();
      if (nativeSetter) nativeSetter.call(ta, next);
      else ta.value = next;

      // Dispatch input/change so frameworks (React) register the change.
      ta.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

      return { ok: true, length: next.length, valueMatches: (ta.value === next) };
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
      const ta =
        document.querySelector('textarea[placeholder*="Ask"]') ||
        textareas.find(t => (t.getAttribute('placeholder') || '').toLowerCase().includes('ask')) ||
        textareas.find(isVisible) ||
        textareas[0];
      if (!ta) return { ok: false, error: 'No <textarea> found' };

      const isDisabled = (b) => {
        if (!b) return true;
        if (b.disabled) return true;
        const aria = (b.getAttribute('aria-disabled') || '').toLowerCase();
        if (aria === 'true') return true;
        return false;
      };

      // Prefer a send button near the textarea, then global fallbacks.
      const localRoot = ta.parentElement || document;
      const localButtons = Array.from(localRoot.querySelectorAll('button'));
      const globalButtons = Array.from(document.querySelectorAll('button'));
      const candidates = [...localButtons, ...globalButtons];

      const pickBest = () => {
        const visible = candidates.filter(isVisible);
        return (
          visible.find(b => !!b.querySelector('img[alt="Send"]')) ||
          visible.find(b => !!b.querySelector('img[src*="send.svg"]')) ||
          visible.find(b => b.type === 'submit') ||
          visible.find(b => /send|submit|run|go/i.test((b.textContent || '').trim())) ||
          visible[0]
        );
      };

      const btn = pickBest();
      if (!btn) return { ok: false, error: 'No <button> found' };
      if (isDisabled(btn)) return { ok: false, error: 'Send button disabled' };

      const fire = (type) => btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      fire('pointerdown');
      fire('mousedown');
      fire('pointerup');
      fire('mouseup');
      fire('click');
      return { ok: true, via: 'button', details: { hasSendImg: !!btn.querySelector('img[alt="Send"], img[src*="send.svg"]') } };

      // Fallback: Enter key.
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
      return { ok: true, via: 'enter' };
    })()`);
  };

  const zyphraWaitForReadyThenSubmit = async ({ expectedText, timeoutMs = 2500 }) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ready = await zyphraExec(`(() => {
        const isVisible = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const ta =
          document.querySelector('textarea[placeholder*="Ask"]') ||
          Array.from(document.querySelectorAll('textarea')).find(t => (t.getAttribute('placeholder') || '').toLowerCase().includes('ask')) ||
          Array.from(document.querySelectorAll('textarea')).find(isVisible);
        if (!ta) return { ok: false, reason: 'no_textarea' };

        const localRoot = ta.parentElement || document;
        const candidates = [
          ...Array.from(localRoot.querySelectorAll('button')),
          ...Array.from(document.querySelectorAll('button')),
        ].filter(isVisible);

        const btn =
          candidates.find(b => !!b.querySelector('img[alt="Send"]')) ||
          candidates.find(b => !!b.querySelector('img[src*="send.svg"]')) ||
          candidates.find(b => b.type === 'submit') ||
          candidates.find(b => /send|submit|run|go/i.test((b.textContent || '').trim())) ||
          candidates[0];

        const disabled = !btn ? true : (btn.disabled || (btn.getAttribute('aria-disabled') || '').toLowerCase() === 'true');
        const matches = typeof ${JSON.stringify(String(expectedText || ""))} === 'string'
          ? (ta.value || '') === ${JSON.stringify(String(expectedText || ""))}
          : true;

        return { ok: true, matches, disabled };
      })()`);

      if (ready?.ok && ready.matches && !ready.disabled) {
        return await zyphraSubmit();
      }

      await new Promise((r) => setTimeout(r, 120));
    }
    // Last attempt: submit anyway.
    return await zyphraSubmit();
  };

  ipcMain.handle("zyphra:setDraft", async (_evt, args) => {
    emitTimeline({ kind: "step", source: args?.source || "unknown", message: "Setting Zyphra draft…" });
    return await zyphraSetDraft({ text: args?.text, mode: args?.mode });
  });

  ipcMain.handle("zyphra:submit", async (_evt, args) => {
    emitTimeline({ kind: "step", source: args?.source || "unknown", message: "Submitting to Zyphra…" });
    return await zyphraSubmit();
  });

  ipcMain.handle("zyphra:send", async (_evt, args) => {
    const source = args?.source || "unknown";
    const text = String(args?.text || "");
    emitTimeline({ kind: "step", source, message: "Setting Zyphra draft…" });
    await zyphraSetDraft({ text, mode: args?.mode });
    emitTimeline({ kind: "step", source, message: "Waiting for Zyphra UI to be ready…" });
    return await zyphraWaitForReadyThenSubmit({ expectedText: text, timeoutMs: args?.timeoutMs || 2500 });
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

  ipcMain.handle("fs:readPdfText", async (_evt, args) => {
    const filePath = String(args?.path || "");
    emitTimeline({ kind: "step", source: args?.source || "unknown", message: `Reading PDF: ${path.basename(filePath)}` });
    const buf = await fs.readFile(filePath);
    emitTimeline({ kind: "step", source: args?.source || "unknown", message: "Extracting PDF text…" });
    const data = await pdfParse(buf);
    return { path: filePath, text: data?.text || "" };
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});