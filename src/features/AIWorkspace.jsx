import React, { useMemo, useState } from "react";
import { estimateTokens, useZyphraBridge } from "../ipc/useZyphraBridge";

export default function AIWorkspace() {
  const { available, openFile, readFile, setDraft, submit } = useZyphraBridge({ source: "workspace" });

  const [filePath, setFilePath] = useState("");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState(true);
  const [error, setError] = useState("");

  const tokenInfo = useMemo(() => {
    return {
      file: estimateTokens(text),
      notes: estimateTokens(notes),
    };
  }, [text, notes]);

  const pickAndLoad = async () => {
    setError("");
    try {
      const sel = await openFile({
        filters: [
          { name: "Text", extensions: ["txt", "md", "json", "csv", "log"] },
          { name: "All files", extensions: ["*"] },
        ],
      });
      if (sel?.canceled) return;
      const fp = sel?.path || "";
      setFilePath(fp);
      const res = await readFile({ path: fp });
      setText(res?.text || "");
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  const buildPayload = () => {
    const parts = [];
    if (pin && notes.trim()) {
      parts.push(`MEMORY (pinned)\n${notes.trim()}\n`);
    }
    if (text.trim()) {
      parts.push(`FILE: ${filePath ? filePath.split(/[\\/]/).pop() : "selected file"}\n${text.trim()}\n`);
    }
    if (parts.length === 0) return "";
    return parts.join("\n---\n\n");
  };

  const insertOnly = async () => {
    const payload = buildPayload();
    if (!payload) return;
    await setDraft({ text: payload, mode: "replace" });
  };

  const insertAndAsk = async () => {
    const payload = buildPayload();
    if (!payload) return;
    const prompt = `${payload}\n\nPlease analyze the content above and return:\n- Summary\n- Key entities\n- Open questions\n- Suggested next actions\n`;
    await setDraft({ text: prompt, mode: "replace" });
    await submit();
  };

  return (
    <div style={{ border: "1px solid #222", background: "#141414", padding: 10 }}>
      <div style={{ fontWeight: 700 }}>AI Workspace (files + memory)</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
        Pick a local file, preview it, optionally pin notes, then inject to Zyphra.
      </div>

      {!available && (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Sidebar IPC bridge not available (are you running inside Electron?).
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          onClick={pickAndLoad}
          disabled={!available}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "#1f1f1f",
            border: "1px solid #333",
            color: "white",
            cursor: available ? "pointer" : "not-allowed",
          }}
        >
          Pick file
        </button>
      </div>

      {filePath && (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
          <b>File:</b> {filePath.split(/[\\/]/).pop()} · ~{tokenInfo.file} tokens
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
          <b>Agent memory (pinned)</b> · ~{tokenInfo.notes} tokens
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes to pin as memory (optional)…"
          style={{
            width: "100%",
            height: 70,
            resize: "vertical",
            background: "#0f0f0f",
            color: "white",
            border: "1px solid #2a2a2a",
            padding: 8,
          }}
        />
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 12 }}>
          <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />
          Include pinned notes in injections
        </label>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
          <b>File preview</b>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="File contents will appear here…"
          style={{
            width: "100%",
            height: 120,
            resize: "vertical",
            background: "#0f0f0f",
            color: "white",
            border: "1px solid #2a2a2a",
            padding: 8,
          }}
        />
      </div>

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#ffb4b4" }}>
          <b>Error:</b> {error}
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          onClick={insertOnly}
          disabled={!available}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "#1f1f1f",
            border: "1px solid #333",
            color: "white",
            cursor: available ? "pointer" : "not-allowed",
          }}
        >
          Insert to Zyphra
        </button>
        <button
          onClick={insertAndAsk}
          disabled={!available}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "#2a203a",
            border: "1px solid #4d3a6a",
            color: "white",
            cursor: available ? "pointer" : "not-allowed",
          }}
        >
          Insert + Ask
        </button>
      </div>
    </div>
  );
}

