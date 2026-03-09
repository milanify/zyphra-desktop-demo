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
    text:
      "You are an AI product copilot for a knowledge worker using an AI desktop assistant. " +
      "Your role is to help the user organize information, summarize large documents, extract insights, " +
      "and propose actionable next steps. Your responses should:\n" +
      "- Prioritize clarity and usability for busy professionals\n" +
      "- Explain trade-offs or uncertainty in your recommendations\n" +
      "- Keep explanations concise but thorough enough for decision-making\n" +
      "- Suggest practical next steps or commands the user can take",
  },
  {
    id: "memory",
    title: "Pinned Memory",
    kind: "memory",
    enabled: true,
    text:
      "Project: AI Productivity Assistant Demo\n" +
      "Goal: showcase a realistic workflow for a user handling large documents, meeting notes, and planning tasks.\n" +
      "Key constraints:\n" +
      "- Must integrate PDF summaries, raw text file analysis, and note processing\n" +
      "- Context should persist across actions but remain editable\n" +
      "- User should be able to toggle memory blocks on/off for prompt composition\n" +
      "- All outputs should be actionable, concise, and relevant for professional use",
  },
  {
    id: "history",
    title: "Conversation History",
    kind: "history",
    enabled: true,
    text:
      "User previously asked:\n" +
      "- Summarize a 120-page market research PDF\n" +
      "- Explain the contents of a long internal report file\n" +
      "- Extract actionable insights from messy raw meeting notes\n" +
      "- Generate reusable UI components for a dashboard displaying KPIs\n" +
      "Assistant has already provided:\n" +
      "- PDF summarization and extraction workflow\n" +
      "- File reading and explanation template\n" +
      "- Basic notes parsing example\n" +
      "- Example React component for a metrics card",
  },
  {
    id: "doc",
    title: "Uploaded Spec / User Scenario",
    kind: "context",
    enabled: false,
    text:
      "Scenario:\n" +
      "The user is preparing for a team strategy session and has multiple raw data sources:\n" +
      "- A lengthy PDF market analysis report (~120 pages) containing text, tables, and charts\n" +
      "- Raw meeting notes from 3 previous sessions, including unstructured bullet points, scribbles, and partial ideas\n" +
      "- Internal project specification files for a new product dashboard\n\n" +
      "The user wants to:\n" +
      "- Summarize key findings and insights from the PDF\n" +
      "- Understand the purpose and key functions in specification files\n" +
      "- Extract potential actionable tasks from messy meeting notes without the notes already containing TODOs\n" +
      "- Feed all this structured context into a single AI assistant for planning and recommendations\n" +
      "- Toggle and combine different context blocks to test the prompt outputs before sending",
  },
];

export default function ContextGraph() {
  const { available, setDraft, submit } = useZyphraBridge({ source: "contextGraph" });
  const [nodes, setNodes] = useState(defaultNodes);
  const [userPrompt, setUserPrompt] = useState(
    "Given this system prompt, project memory, and recent history, propose 3 concrete UI improvements " +
      "that would make this AI productivity assistant workflow more realistic and production-ready for end users."
  );
  const [graphOpen, setGraphOpen] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState(null);

  const totals = useMemo(() => {
    const allWithTokens = nodes.map((n) => ({
      ...n,
      tokens: estimateTokens(n.text),
    }));
    const enabled = allWithTokens.filter((n) => n.enabled);
    const contextTokens = enabled.reduce((sum, n) => sum + n.tokens, 0);
    const userTokens = estimateTokens(userPrompt);
    const total = contextTokens + userTokens;
    return { all: allWithTokens, enabled, contextTokens, userTokens, total };
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>Context Graph (working memory)</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            Context: {totals.contextTokens} · User: {totals.userTokens} · Total: {totals.total} / 32000
          </div>
        </div>
        <button
          onClick={() => setGraphOpen(true)}
          style={{
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #333",
            background: "#111827",
            color: "#e5e7eb",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Open graph view
        </button>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
        Toggle which context blocks get composed into the prompt, then inject it into Zyphra.
      </div>

      {/* Add Node */}
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

      {/* Context Nodes */}
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
                height: 100,
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

      {/* User Prompt */}
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

      {/* Prompt Preview */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
          <b>Prompt preview</b>
        </div>
        <textarea
          readOnly
          value={promptPreview}
          style={{
            width: "100%",
            height: 140,
            resize: "vertical",
            background: "#0f0f0f",
            color: "white",
            border: "1px solid #2a2a2a",
            padding: 8,
          }}
        />
      </div>

      {/* Actions */}
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

      {/* Graph Overlay */}
      {graphOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onMouseDown={() => setGraphOpen(false)}
        >
          <div
            style={{
              width: 420,
              maxWidth: "90vw",
              background: "#050509",
              borderRadius: 12,
              border: "1px solid #27272a",
              boxShadow: "0 18px 45px rgba(0,0,0,0.75)",
              padding: 12,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Context Graph View</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Each node contributes tokens into the final prompt.</div>
              </div>
              <button
                onClick={() => setGraphOpen(false)}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <GraphCanvas
              nodes={totals.all}
              userTokens={totals.userTokens}
              focusedNodeId={focusedNodeId}
              setFocusedNodeId={setFocusedNodeId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// GraphCanvas and LegendRow stay the same as before
function GraphCanvas({ nodes, userTokens, focusedNodeId, setFocusedNodeId }) {
  const width = 380;
  const height = 240;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 80;

  const enabledNodes = nodes;
  const count = enabledNodes.length || 1;

  const central = {
    id: "user",
    label: "User Prompt",
    tokens: userTokens,
  };

  const positions = enabledNodes.map((n, idx) => {
    const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { node: n, x, y };
  });

  const kindColor = (kind) => {
    if (kind === "system") return "#f97316";
    if (kind === "memory") return "#22c55e";
    if (kind === "context") return "#38bdf8";
    return "#a855f7";
  };

  const getFocused = () => {
    if (!focusedNodeId) return null;
    if (focusedNodeId === "user") return central;
    return nodes.find((n) => n.id === focusedNodeId) || null;
  };

  const focused = getFocused();

  return (
    <div>
      <svg width={width} height={height} style={{ borderRadius: 8, background: "#020617" }}>
        {positions.map((p) => (
          <line key={`edge-${p.node.id}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1f2937" strokeWidth={1} />
        ))}
        {positions.map((p) => (
          <g
            key={p.node.id}
            transform={`translate(${p.x},${p.y})`}
            onMouseEnter={() => setFocusedNodeId(p.node.id)}
            onMouseLeave={() => setFocusedNodeId((id) => (id === p.node.id ? null : id))}
          >
            <circle
              r={16}
              fill={p.node.enabled ? kindColor(p.node.kind) : "#0f172a"}
              stroke={p.node.enabled ? "#e5e7eb" : "#4b5563"}
              strokeWidth={p.node.enabled ? 2 : 1}
              style={{ cursor: "default" }}
            />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize="10"
              fill="#0b1120"
              style={{ pointerEvents: "none" }}
            >
              {p.node.title.slice(0, 3)}
            </text>
          </g>
        ))}
        <g
          transform={`translate(${cx},${cy})`}
          onMouseEnter={() => setFocusedNodeId("user")}
          onMouseLeave={() => setFocusedNodeId((id) => (id === "user" ? null : id))}
        >
          <circle r={20} fill="#e5e7eb" stroke="#4b5563" strokeWidth={2} />
          <text x={0} y={-2} textAnchor="middle" fontSize="9" fill="#020617" style={{ pointerEvents: "none" }}>
            User
          </text>
          <text x={0} y={8} textAnchor="middle" fontSize="9" fill="#020617" style={{ pointerEvents: "none" }}>
            Prompt
          </text>
        </g>
      </svg>
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 10, opacity: 0.8 }}>
          <div style={{ marginBottom: 2 }}>Legend</div>
          <LegendRow color="#f97316" label="System" />
          <LegendRow color="#22c55e" label="Memory" />
          <LegendRow color="#38bdf8" label="Context" />
          <LegendRow color="#a855f7" label="Other" />
        </div>
        <div
          style={{
            flex: 1,
            border: "1px solid #1f2937",
            borderRadius: 8,
            padding: 6,
            fontSize: 11,
            minHeight: 60,
            background: "#020617",
            overflow: "hidden",
          }}
        >
          {focused ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {focused.label || focused.title}{" "}
                <span style={{ opacity: 0.7 }}>· ~{focused.tokens} tokens</span>
              </div>
              {focused.kind && (
                <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 4 }}>Kind: {focused.kind}</div>
              )}
              {focused.text && (
                <div style={{ fontSize: 10, opacity: 0.9 }}>
                  {focused.text.length > 140 ? `${focused.text.slice(0, 140)}…` : focused.text}
                </div>
              )}
              {!focused.text && focused.id === "user" && (
                <div style={{ fontSize: 10, opacity: 0.9 }}>
                  User prompt contributes ~{focused.tokens} tokens into the final context.
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 10, opacity: 0.7 }}>Hover a node to inspect its contribution.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "999px",
          background: color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}