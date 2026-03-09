import React, { useMemo, useState } from "react";
import { estimateTokens, useZyphraBridge } from "../ipc/useZyphraBridge";

function uid() {
  return Math.random().toString(16).slice(2);
}

export default function AIWorkspace() {
  const { available, openFile, readFile, send } = useZyphraBridge({ source: "workspace" });

  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [memoryItems, setMemoryItems] = useState([]);
  const [newMemory, setNewMemory] = useState("");
  const [workspaceQuestion, setWorkspaceQuestion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const tokenSummary = useMemo(() => {
    const fileTokens = files.reduce((sum, f) => sum + (f.tokens || 0), 0);
    const memoryTokens = memoryItems.reduce((sum, m) => sum + (m.tokens || 0), 0);
    return { fileTokens, memoryTokens, total: fileTokens + memoryTokens };
  }, [files, memoryItems]);

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || files[0] || null,
    [files, activeFileId],
  );

  const upsertFileFromPath = async (path) => {
    const res = await readFile({ path });
    const text = res?.text || "";
    const name = path.split(/[\\/]/).pop() || "file";
    const id = uid();
    const entry = {
      id,
      name,
      path,
      text,
      tokens: estimateTokens(text),
      addedAt: Date.now(),
    };
    setFiles((prev) => [entry, ...prev]);
    setActiveFileId(id);
  };

  const pickFile = async () => {
    setError("");
    try {
      const sel = await openFile({
        filters: [
          { name: "Text-like", extensions: ["txt", "md", "json", "csv", "log"] },
          { name: "All files", extensions: ["*"] },
        ],
      });
      if (sel?.canceled || !sel?.path) return;
      await upsertFileFromPath(sel.path);
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    setError("");
    try {
      const fileList = Array.from(event.dataTransfer.files || []);
      for (const f of fileList.slice(0, 3)) {
        if (!f.path) continue;
        // eslint-disable-next-line no-await-in-loop
        await upsertFileFromPath(f.path);
      }
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const addMemory = () => {
    const trimmed = newMemory.trim();
    if (!trimmed) return;
    const item = {
      id: uid(),
      text: trimmed,
      tokens: estimateTokens(trimmed),
      createdAt: Date.now(),
    };
    setMemoryItems((prev) => [item, ...prev]);
    setNewMemory("");
  };

  const removeMemory = (id) => {
    setMemoryItems((prev) => prev.filter((m) => m.id !== id));
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    files.forEach((f) => {
      if (f.text.toLowerCase().includes(q)) {
        results.push({ kind: "file", id: f.id, name: f.name });
      }
    });
    memoryItems.forEach((m) => {
      if (m.text.toLowerCase().includes(q)) {
        results.push({ kind: "memory", id: m.id, name: "Pinned note" });
      }
    });
    return results;
  }, [files, memoryItems, searchQuery]);

  const buildWorkspaceContext = () => {
    const lines = [];
    if (files.length) {
      lines.push("FILES IN WORKSPACE:");
      files.forEach((f, idx) => {
        lines.push(
          `${idx + 1}. ${f.name} (~${f.tokens} tokens)`,
        );
      });
      lines.push("");
    }
    if (memoryItems.length) {
      lines.push("PINNED MEMORY:");
      memoryItems.forEach((m, idx) => {
        lines.push(`- [${idx + 1}] ${m.text}`);
      });
      lines.push("");
    }
    if (activeFile) {
      lines.push(`ACTIVE FILE: ${activeFile.name}`);
      lines.push(activeFile.text);
    }
    return lines.join("\n");
  };

  const summarizeWorkspace = async () => {
    const ctx = buildWorkspaceContext();
    if (!ctx.trim()) return;
    const prompt =
      "You are an AI assistant working inside a multi-panel workspace.\n\n" +
      "Using the workspace context below (files + pinned memory), produce a concise summary that a human could use to understand the project quickly.\n\n" +
      "Output:\n" +
      "- High-level summary\n" +
      "- Key entities (files, concepts, owners)\n" +
      "- Open questions\n" +
      "- Suggested next actions\n\n" +
      "WORKSPACE CONTEXT:\n" +
      ctx;
    await send({ text: prompt, mode: "replace", timeoutMs: 5000 });
  };

  const askAboutWorkspace = async () => {
    const q = workspaceQuestion.trim();
    if (!q) return;
    const ctx = buildWorkspaceContext();
    const prompt =
      "You are answering a question about the current workspace (files + pinned memory).\n\n" +
      "First, very briefly restate your understanding of the workspace, then answer the user question.\n\n" +
      "WORKSPACE CONTEXT:\n" +
      ctx +
      "\n\nUSER QUESTION:\n" +
      q;
    await send({ text: prompt, mode: "replace", timeoutMs: 5000 });
  };

  return (
    <div
      style={{
        border: "1px solid #222",
        background: "#141414",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 700 }}>AI Workspace</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>
          ~{tokenSummary.total} tokens ({files.length} files, {memoryItems.length} notes)
        </div>
      </div>

      {!available && (
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
          Sidebar IPC bridge not available (are you running inside Electron?).
        </div>
      )}

      {/* Top row: three mini-panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.2fr 1.2fr",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        {/* Files */}
        <div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
            <b>Files</b>
          </div>
          {/*<div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: "1px dashed #333",
              borderRadius: 8,
              padding: 6,
              background: isDragging ? "#111827" : "#101010",
              fontSize: 11,
              textAlign: "center",
              cursor: "copy",
            }}
          >
            Drag files here
          </div>
          */}
          <button
            onClick={pickFile}
            disabled={!available}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "6px 8px",
              fontSize: 11,
              background: "#1f2933",
              border: "1px solid #374151",
              color: "white",
              cursor: available ? "pointer" : "not-allowed",
            }}
          >
            Pick file…
          </button>
          <div
            style={{
              marginTop: 6,
              maxHeight: 90,
              overflowY: "auto",
              fontSize: 11,
            }}
          >
            {files.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No files yet.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {files.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => setActiveFileId(f.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "4px 6px",
                        borderRadius: 6,
                        border: "1px solid #222",
                        background: activeFile && activeFile.id === f.id ? "#1f2937" : "#111827",
                        color: "white",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {f.name} · ~{f.tokens}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Memory */}
        <div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
            <b>Agent Memory</b>
          </div>
          <textarea
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Quick note to pin…"
            style={{
              width: "100%",
              height: 50,
              resize: "none",
              background: "#0f0f0f",
              color: "white",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: 6,
              fontSize: 11,
            }}
          />
          <button
            onClick={addMemory}
            style={{
              marginTop: 4,
              width: "100%",
              padding: "6px 8px",
              fontSize: 11,
              background: "#312e81",
              border: "1px solid #4338ca",
              color: "white",
              cursor: "pointer",
            }}
          >
            Pin to memory
          </button>
          <div
            style={{
              marginTop: 6,
              maxHeight: 90,
              overflowY: "auto",
              fontSize: 11,
            }}
          >
            {memoryItems.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No pinned notes.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {memoryItems.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      border: "1px solid #222",
                      borderRadius: 6,
                      padding: 4,
                      background: "#111827",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 11, maxHeight: 48, overflow: "hidden" }}>{m.text}</div>
                    <button
                      onClick={() => removeMemory(m.id)}
                      style={{
                        fontSize: 10,
                        padding: "2px 4px",
                        borderRadius: 4,
                        border: "1px solid #4b5563",
                        background: "transparent",
                        color: "#e5e7eb",
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Search */}
        <div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
            <b>Search context</b>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files + memory…"
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #2a2a2a",
              background: "#0f0f0f",
              color: "white",
              fontSize: 11,
            }}
          />
          <div
            style={{
              marginTop: 6,
              maxHeight: 100,
              overflowY: "auto",
              fontSize: 11,
            }}
          >
            {searchQuery.trim() && searchResults.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No matches.</div>
            ) : searchResults.length === 0 ? (
              <div style={{ opacity: 0.7 }}>Type to search workspace context.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {searchResults.map((r, idx) => (
                  <li
                    key={`${r.kind}-${r.id}-${idx}`}
                    style={{
                      border: "1px solid #222",
                      borderRadius: 6,
                      padding: 4,
                      background: "#111827",
                    }}
                  >
                    <span
                      style={{
                        padding: "1px 4px",
                        borderRadius: 999,
                        border: "1px solid #374151",
                        marginRight: 4,
                        fontSize: 10,
                      }}
                    >
                      {r.kind}
                    </span>
                    <span>{r.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: active file + agent actions */}
      <div
        style={{
          marginTop: 8,
          borderTop: "1px solid #222",
          paddingTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
            <b>Active file preview</b>
          </div>
          {activeFile ? (
            <textarea
              value={activeFile.text}
              readOnly
              style={{
                width: "100%",
                height: 90,
                resize: "vertical",
                background: "#0f0f0f",
                color: "white",
                border: "1px solid #2a2a2a",
                padding: 8,
                fontSize: 11,
                whiteSpace: "pre-wrap",
              }}
            />
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>No active file. Drag or pick one above.</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
            <b>Ask Zyphra about this workspace</b>
          </div>
          <textarea
            value={workspaceQuestion}
            onChange={(e) => setWorkspaceQuestion(e.target.value)}
            placeholder="e.g. What are the main risks and next steps in these files + notes?"
            style={{
              width: "100%",
              height: 60,
              resize: "vertical",
              background: "#0f0f0f",
              color: "white",
              border: "1px solid #2a2a2a",
              padding: 8,
              fontSize: 11,
            }}
          />
          <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
            <button
              onClick={summarizeWorkspace}
              disabled={!available}
              style={{
                flex: 1,
                padding: "8px 10px",
                background: "#1f1f1f",
                border: "1px solid #333",
                color: "white",
                cursor: available ? "pointer" : "not-allowed",
                fontSize: 12,
              }}
            >
              Summarize workspace
            </button>
            <button
              onClick={askAboutWorkspace}
              disabled={!available}
              style={{
                flex: 1,
                padding: "8px 10px",
                background: "#2a203a",
                border: "1px solid #4d3a6a",
                color: "white",
                cursor: available ? "pointer" : "not-allowed",
                fontSize: 12,
              }}
            >
              Answer my question
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 4, fontSize: 12, color: "#ffb4b4" }}>
            <b>Error:</b> {error}
          </div>
        )}
      </div>
    </div>
  );
}

