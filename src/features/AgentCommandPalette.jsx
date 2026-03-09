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
  const { available, setDraft, submit } = useZyphraBridge({ source: "commandPalette" });
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

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

  const commands = useMemo(
    () => [
      {
        id: "summarize",
        title: "Summarize (paste request)",
        subtitle: "Insert a good summarization prompt",
        run: async () => {
          const prompt =
            "Summarize the content above. Output:\n- 5 bullet key points\n- 3 follow-up questions\n- One-liner takeaway\n";
          await setDraft({ text: prompt, mode: "replace" });
        },
      },
      {
        id: "extractTodos",
        title: "Extract action items",
        subtitle: "Insert a TODO extraction prompt",
        run: async () => {
          const prompt =
            "Extract action items from the content above.\nReturn JSON: { todos: [{title, owner?, due?, priority?}], risks: [], open_questions: [] }\n";
          await setDraft({ text: prompt, mode: "replace" });
        },
      },
      {
        id: "generateComponent",
        title: "Generate React component",
        subtitle: "Insert a component generation prompt",
        run: async () => {
          const prompt =
            "Generate a React component for the described UI.\nRequirements:\n- accessible\n- minimal dependencies\n- include usage example\nReturn only code.\n";
          await setDraft({ text: prompt, mode: "replace" });
        },
      },
      {
        id: "submit",
        title: "Submit current draft to Zyphra",
        subtitle: "Click the Zyphra send button",
        run: async () => {
          await submit();
        },
      },
    ],
    [setDraft, submit],
  );

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
          disabled={!available}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#1f1f1f",
            border: "1px solid #333",
            color: "white",
            cursor: available ? "pointer" : "not-allowed",
          }}
        >
          Open Palette
        </button>
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
                      setOpen(false);
                      setValue("");
                      await c.run();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 650 }}>{c.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{c.subtitle}</div>
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

