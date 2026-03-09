import React, { useMemo, useState } from "react";
import AgentCommandPalette from "./features/AgentCommandPalette";
import AgentExecutionTimeline from "./features/AgentExecutionTimeline";
import AIWorkspace from "./features/AIWorkspace";
import ContextGraph from "./features/ContextGraph";

function App() {
  const panels = useMemo(
    () => [
      { id: "palette", title: "1) Command Palette", component: <AgentCommandPalette /> },
      { id: "timeline", title: "2) Execution Timeline", component: <AgentExecutionTimeline /> },
      { id: "workspace", title: "3) AI Workspace", component: <AIWorkspace /> },
      { id: "context", title: "4) Context Graph", component: <ContextGraph /> },
    ],
    [],
  );

  // Showcase independently (tabs) or together (multi-select).
  const [mode, setMode] = useState("tabs"); // "tabs" | "multi"
  const [activeTab, setActiveTab] = useState("palette");
  const [enabled, setEnabled] = useState(() => new Set(["palette", "timeline"]));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0f0f0f",
        color: "white",
        padding: "1rem",
        fontFamily: "system-ui",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Zyphra Agent Sidebar</h2>
        <div style={{ fontSize: 12, opacity: 0.8 }}>4 independent demo features</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setMode("tabs")}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: mode === "tabs" ? "#2a203a" : "#1f1f1f",
            border: "1px solid #333",
            color: "white",
            cursor: "pointer",
          }}
        >
          Tab mode
        </button>
        <button
          onClick={() => setMode("multi")}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: mode === "multi" ? "#2a203a" : "#1f1f1f",
            border: "1px solid #333",
            color: "white",
            cursor: "pointer",
          }}
        >
          Multi mode
        </button>
      </div>

      {mode === "tabs" ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {panels.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  background: activeTab === p.id ? "#1a1a1a" : "#121212",
                  border: "1px solid #222",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {p.title}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            {panels.find((p) => p.id === activeTab)?.component}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {panels.map((p) => {
              const on = enabled.has(p.id);
              return (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    border: "1px solid #222",
                    background: "#121212",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => {
                      setEnabled((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      });
                    }}
                  />
                  <b>{p.title}</b>
                </label>
              );
            })}
          </div>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {panels
              .filter((p) => enabled.has(p.id))
              .map((p) => (
                <div key={p.id}>{p.component}</div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;