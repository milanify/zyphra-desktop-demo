import React, { useState } from "react";
import Palette from "./Palette";

function App() {
  // CENTRALIZED AGENT STATE

  const [agentState, setAgentState] = useState({
    status: "idle",
    currentTask: null,
    steps: [],
    result: null,
  });

  const [paletteOpen, setPaletteOpen] = useState(false);

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
        gap: "16px",
      }}
    >
      <h2>Agent Control</h2>

      <button
        onClick={() => setPaletteOpen(true)}
        style={{
          padding: "8px 12px",
          background: "#1f1f1f",
          border: "1px solid #333",
          color: "white",
          cursor: "pointer",
        }}
      >
        Open Command Palette (⌘K)
      </button>

      {/* AGENT STATUS */}

      <div
        style={{
          padding: "10px",
          background: "#141414",
          border: "1px solid #222",
        }}
      >
        <b>Status:</b> {agentState.status}

        {agentState.currentTask && (
          <div>
            <b>Task:</b> {agentState.currentTask}
          </div>
        )}
      </div>

      {/* EXECUTION STEPS */}

      {agentState.steps.length > 0 && (
        <div
          style={{
            background: "#141414",
            padding: "10px",
            border: "1px solid #222",
          }}
        >
          <b>Agent Actions</b>

          <ul style={{ marginTop: "10px" }}>
            {agentState.steps.map((step, i) => (
              <li key={i}>✓ {step}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RESULT */}

      {agentState.result && (
        <div
          style={{
            background: "#141414",
            padding: "10px",
            border: "1px solid #222",
          }}
        >
          <b>Output</b>

          <pre style={{ marginTop: "10px", whiteSpace: "pre-wrap" }}>
            {agentState.result}
          </pre>
        </div>
      )}

      <Palette
        open={paletteOpen}
        setOpen={setPaletteOpen}
        agentState={agentState}
        setAgentState={setAgentState}
      />
    </div>
  );
}

export default App;