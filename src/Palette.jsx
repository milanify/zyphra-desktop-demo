import React, { useEffect } from "react";

function Palette({ open, setOpen, agentState, setAgentState }) {

  // -------------------------
  // KEYBOARD SHORTCUT
  // -------------------------

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        runCommand("summarizeConversation");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // -------------------------
  // AGENT STATE HELPERS
  // -------------------------

  const startTask = (task) => {
    setAgentState({
      status: "running",
      currentTask: task,
      steps: [],
      result: null,
    });
  };

  const addStep = (step) => {
    setAgentState((prev) => ({
      ...prev,
      steps: [...prev.steps, step],
    }));
  };

  const finishTask = (result) => {
    setAgentState((prev) => ({
      ...prev,
      status: "complete",
      result,
    }));
  };

  // -------------------------
  // COMMANDS
  // -------------------------

  const commands = {
    summarizeConversation: async () => {
      startTask("Summarize Conversation");

      addStep("Reading conversation...");
      await sleep(800);

      addStep("Extracting key points...");
      await sleep(800);

      addStep("Generating summary...");
      await sleep(800);

      finishTask(`
• User is building an Electron agent UI
• Sidebar overlay contains command palette
• Agent execution trace is displayed
`);
    },

    generateComponent: async () => {
      startTask("Generate React Component");

      addStep("Analyzing request...");
      await sleep(800);

      addStep("Generating component...");
      await sleep(800);

      addStep("Formatting code...");
      await sleep(800);

      finishTask(`
function Button() {
  return <button>Click me</button>
}
`);
    },

    extractTodos: async () => {
      startTask("Extract Todos");

      addStep("Scanning conversation...");
      await sleep(800);

      addStep("Identifying tasks...");
      await sleep(800);

      finishTask(`
• Implement command palette
• Add agent execution trace
• Connect real AI API
`);
    },
  };

  const runCommand = async (cmd) => {
    setOpen(false);
    await commands[cmd]();
  };

  // -------------------------
  // UI
  // -------------------------

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "100px",
        right: "20px",
        width: "280px",
        background: "#1a1a1a",
        border: "1px solid #333",
        padding: "10px",
        zIndex: 1000,
      }}
    >
      <b>Command Palette</b>

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <button onClick={() => runCommand("summarizeConversation")}>
          Summarize Conversation
        </button>

        <button onClick={() => runCommand("generateComponent")}>
          Generate React Component
        </button>

        <button onClick={() => runCommand("extractTodos")}>
          Extract Todos
        </button>
      </div>

      <button
        onClick={() => setOpen(false)}
        style={{
          marginTop: "10px",
          fontSize: "12px",
        }}
      >
        Close
      </button>
    </div>
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default Palette;