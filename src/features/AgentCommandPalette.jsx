import React, { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useZyphraBridge } from "../ipc/useZyphraBridge";

const baseStyles = {
  container: {
    border: "1px solid #222",
    background: "#141414",
    padding: 10,
  },
  badge: {
    fontSize: 11,
    opacity: 0.8,
    border: "1px solid #2a2a2a",
    padding: "2px 6px",
    borderRadius: 999,
  },
};

export default function AgentCommandPalette() {
  const { available, openFile, readFile, readPdfText, send } = useZyphraBridge({
    source: "commandPalette",
  });
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const clamp = (s, maxChars) => {
    const str = String(s || "");
    if (str.length <= maxChars) return str;
    return `${str.slice(0, maxChars)}\n\n[Truncated: ${str.length - maxChars} chars omitted]`;
  };

  const runSafely = async (fn) => {
    setStatus("");
    try {
      await fn();
      setStatus("Done.");
    } catch (e) {
      setStatus(`Error: ${String(e?.message || e)}`);
    }
  };

  const commands = useMemo(() => {
    const ensure = (needed) => (available ? undefined : `Requires Electron bridge (${needed}).`);

    return [
      // Tier 1
      {
        id: "summarizePdf",
        title: "Summarize PDF",
        subtitle: "> summarize pdf",
        disabledReason: ensure("file picker + pdf text extraction"),
        run: async () =>
          await runSafely(async () => {
            const sel = await openFile({
              filters: [{ name: "PDF", extensions: ["pdf"] }],
            });
            if (sel?.canceled) return;
            const fp = sel?.path;
            setStatus("Extracting PDF text…");
            const res = await readPdfText({ path: fp });
            const extracted = clamp(res?.text || "", 25000);
            const prompt = `Summarize this PDF.\n\nOutput:\n- key ideas\n- action items\n- important numbers\n\nPDF TEXT:\n${extracted}\n`;
            setStatus("Injecting prompt to Zyphra…");
            await send({ text: prompt, mode: "replace", timeoutMs: 4000 });
          }),
      },
      {
        id: "explainFile",
        title: "Explain This File",
        subtitle: "> explain file",
        disabledReason: ensure("file picker + file read"),
        run: async () =>
          await runSafely(async () => {
            const sel = await openFile({
              filters: [
                { name: "Text", extensions: ["txt", "md", "js", "jsx", "ts", "tsx", "py", "go", "rs", "java", "json", "yaml", "yml"] },
                { name: "All files", extensions: ["*"] },
              ],
            });
            if (sel?.canceled) return;
            const fp = sel?.path;
            setStatus("Reading file…");
            const res = await readFile({ path: fp });
            const content = clamp(res?.text || "", 25000);
            const filename = fp?.split(/[\\/]/).pop() || "file";
            const prompt = `Explain this file: ${filename}\n\nReturn:\n- Purpose\n- Key functions/classes\n- Dependencies\n- How it works\n\nFILE CONTENT:\n${content}\n`;
            setStatus("Injecting prompt to Zyphra…");
            await send({ text: prompt, mode: "replace", timeoutMs: 4000 });
          }),
      },
      {
        id: "generateComponent",
        title: "Generate UI Component",
        subtitle: "> generate component",
        disabledReason: ensure("Zyphra injection"),
        run: async () =>
          await runSafely(async () => {
            const sel = await openFile({
              filters: [
                { name: "UI description", extensions: ["txt", "md"] },
                { name: "All files", extensions: ["*"] },
              ],
            });
            if (sel?.canceled) return;
            const fp = sel?.path;
            setStatus("Reading UI description…");
            const res = await readFile({ path: fp });
            const description = clamp(res?.text || "", 8000);
            const filename = fp?.split(/[\\/]/).pop() || "description.txt";

            const prompt =
              `Generate a React component for the UI described in ${filename}.\n\nConstraints:\n` +
              `- Use React + Tailwind\n` +
              `- Accessible (labels, focus states)\n` +
              `- Provide a single component + an example usage snippet\n` +
              `- Return only code\n\n` +
              `UI DESCRIPTION:\n${description}\n`;

            setStatus("Injecting component prompt to Zyphra…");
            await send({ text: prompt, mode: "replace", timeoutMs: 4000 });
          }),
      },
      {
        id: "extractTodos",
        title: "Extract Todos From Notes",
        subtitle: "> extract todos",
        disabledReason: ensure("file picker + file read"),
        run: async () =>
          await runSafely(async () => {
            const sel = await openFile({
              filters: [{ name: "Text", extensions: ["txt", "md"] }],
            });
            if (sel?.canceled) return;
            const fp = sel?.path;
            setStatus("Reading notes…");
            const res = await readFile({ path: fp });
            const content = clamp(res?.text || "", 25000);
            const prompt = `You are helping turn messy meeting notes into a simple action list.\n\n` +
              `From the notes below, extract only clear, concrete action items as bullet points.\n` +
              `Keep the format very simple:\n` +
              `- one bullet per action\n` +
              `- include owner and/or rough timing only if they are explicitly mentioned\n` +
              `- do NOT include background, commentary, or non-actionable observations\n\n` +
              `Meeting notes:\n${content}\n`;
            await send({ text: prompt, mode: "replace", timeoutMs: 4000 });
          }),
      },
      // Tier 2/3 placeholders (wired later)
      {
        id: "analyzeRepo",
        title: "Analyze Repository",
        subtitle: "> analyze repository (coming next)",
        disabledReason: "Next: add folder picker + recursive file scan.",
        run: async () => {},
      },
      {
        id: "searchFiles",
        title: "Search My Files",
        subtitle: "> search files (coming next)",
        disabledReason: "Next: add folder picker + search.",
        run: async () => {},
      },
      {
        id: "compareFiles",
        title: "Compare Two Files",
        subtitle: "> compare files (coming next)",
        disabledReason: "Next: add 2-file picker + diff prompt builder.",
        run: async () => {},
      },
      {
        id: "draftEmail",
        title: "Turn Notes Into Email",
        subtitle: "> draft email (coming next)",
        disabledReason: "Next: add notes file picker + email template prompt.",
        run: async () => {},
      },
      {
        id: "convertFile",
        title: "Convert File",
        subtitle: "> convert file (coming next)",
        disabledReason: "Next: add conversion target selection.",
        run: async () => {},
      },
      {
        id: "generateDiagram",
        title: "Generate Diagram",
        subtitle: "> generate diagram (coming next)",
        disabledReason: "Next: add diagram prompt builder.",
        run: async () => {},
      },
      {
        id: "reviewCode",
        title: "Find Bugs (Review Code)",
        subtitle: "> review code (coming next)",
        disabledReason: "Next: add file picker + review prompt builder.",
        run: async () => {},
      },
      {
        id: "generateTests",
        title: "Write Tests",
        subtitle: "> generate tests (coming next)",
        disabledReason: "Next: add file picker + test prompt builder.",
        run: async () => {},
      },
      {
        id: "refactorFile",
        title: "Refactor File",
        subtitle: "> refactor file (coming next)",
        disabledReason: "Next: add file picker + refactor goals prompt builder.",
        run: async () => {},
      },
    ];
  }, [available, openFile, readFile, readPdfText, send]);

  return (
    <div style={baseStyles.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 700 }}>Agent Command Palette</div>
        <span style={baseStyles.badge}>⌘K</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
        Keyboard-first command surface that can insert/submit to the Zyphra chat.
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          onClick={() => setOpen(true)}
          disabled={false}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#1f1f1f",
            border: "1px solid #333",
            color: "white",
            cursor: "pointer",
          }}
        >
          Open Palette
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        <b>Bridge:</b> {available ? "connected" : "not detected"} {status ? `· ${status}` : ""}
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 50,
            zIndex: 9999,
          }}
          onMouseDown={() => setOpen(false)}
        >
          <div
            style={{
              width: 300,
              background: "#0f0f0f",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Command value={value} onValueChange={setValue} style={{ padding: 8 }}>
              <Command.Input
                autoFocus
                placeholder="Type a command…"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #2a2a2a",
                  background: "#141414",
                  color: "white",
                  outline: "none",
                }}
              />
              <Command.List style={{ marginTop: 8, maxHeight: 320, overflow: "auto" }}>
                <Command.Empty style={{ padding: 10, opacity: 0.7 }}>No results.</Command.Empty>
                {commands.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`${c.title} ${c.subtitle}`}
                    onSelect={async () => {
                      if (c.disabledReason) return;
                      setOpen(false);
                      setValue("");
                      await c.run();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      cursor: c.disabledReason ? "not-allowed" : "pointer",
                      opacity: c.disabledReason ? 0.5 : 1,
                    }}
                  >
                    <div style={{ fontWeight: 650 }}>{c.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{c.subtitle}</div>
                    {c.disabledReason && (
                      <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{c.disabledReason}</div>
                    )}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </div>
  );
}

