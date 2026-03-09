import React, { useMemo, useState } from "react";
import { estimateTokens, useZyphraBridge } from "../ipc/useZyphraBridge";

function uid() {
  return Math.random().toString(16).slice(2);
}

const defaultNodes = [
  {
    id: "system",
    title: "System Prompt",
    kind: "system",
    enabled: true,
    text: "You are a helpful assistant. Be concise, correct, and cite assumptions.",
  },
  {
    id: "memory",
    title: "Pinned Memory",
    kind: "memory",
    enabled: true,
    text: "This is a Zyphra desktop demo. The sidebar can insert context into the Zyphra web chat via Electron.",
  },
];

export default function ContextGraph() {
  const { available, setDraft, submit } = useZyphraBridge({ source: "contextGraph" });
  const [nodes, setNodes] = useState(defaultNodes);
  const [userPrompt, setUserPrompt] = useState("Summarize the included context and propose next steps.");

  const totals = useMemo(() => {
    const enabled = nodes.filter((n) => n.enabled);
    const byNode = enabled.map((n) => ({ id: n.id, tokens: estimateTokens(n.text) }));
    const total = byNode.reduce((a, b) => a + b.tokens, 0) + estimateTokens(userPrompt);
    return { enabled, byNode, total };
  }, [nodes, userPrompt]);

  const promptPreview = useMemo(() => {
    const parts = [];
    for (const n of totals.enabled) {
      const header = n.kind === "system" ? "SYSTEM" : n.kind.toUpperCase();
      parts.push(`${header}:\n${n.text}`);
    }
    parts.push(`USER:\n${userPrompt}`);
    return parts.join("\n\n---\n\n");
  }, [totals.enabled, userPrompt]);

  const toggle = (id) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)));
  };

  const updateText = (id, text) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const addNode = () => {
    const id = uid();
    setNodes((prev) => [
      ...prev,
      { id, title: "New Context", kind: "context", enabled: true, text: "Add context here…" },
    ]);
  };

  const removeNode = (id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const insertOnly = async () => {
    await setDraft({ text: promptPreview, mode: "replace" });
  };

  const insertAndSend = async () => {
    await setDraft({ text: promptPreview, mode: "replace" });
    await submit();
  };

  return (
    <div style={{ border: "1px solid #222", background: "#141414", padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 700 }}>Context Graph (working memory)</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>~{totals.total} tokens</div>
      </div>

      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
        Toggle which context blocks get composed into the prompt, then inject it into Zyphra.
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          onClick={addNode}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "#1f1f1f",
            border: "1px solid #333",
            color: "white",
            cursor: "pointer",
          }}
        >
          Add context node
        </button>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {nodes.map((n) => (
          <div key={n.id} style={{ border: "1px solid #1f1f1f", borderRadius: 10, padding: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input type="checkbox" checked={n.enabled} onChange={() => toggle(n.id)} />
                <b>{n.title}</b>
                <span style={{ opacity: 0.7 }}>({n.kind})</span>
              </label>
              {n.id !== "system" && (
                <button
                  onClick={() => removeNode(n.id)}
                  style={{
                    padding: "4px 8px",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              value={n.text}
              onChange={(e) => updateText(n.id, e.target.value)}
              style={{
                width: "100%",
                height: 70,
                resize: "vertical",
                background: "#0f0f0f",
                color: "white",
                border: "1px solid #2a2a2a",
                padding: 8,
                marginTop: 8,
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
          <b>User prompt</b>
        </div>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          style={{
            width: "100%",
            height: 60,
            resize: "vertical",
            background: "#0f0f0f",
            color: "white",
            border: "1px solid #2a2a2a",
            padding: 8,
          }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
          <b>Prompt preview</b>
        </div>
        <textarea
          readOnly
          value={promptPreview}
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
          Insert prompt
        </button>
        <button
          onClick={insertAndSend}
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
          Insert + Send
        </button>
      </div>
    </div>
  );
}

