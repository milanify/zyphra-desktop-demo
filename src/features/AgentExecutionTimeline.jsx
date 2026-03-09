import React, { useMemo, useState } from "react";
import { useZyphraBridge } from "../ipc/useZyphraBridge";

export default function AgentExecutionTimeline() {
  const { timeline, clearTimeline } = useZyphraBridge({ source: "timeline" });
  const [filter, setFilter] = useState("all");

  const compactUrl = (full) => {
    if (!full) return "";
    try {
      const u = new URL(full);
      return `${u.pathname}${u.search || ""}`;
    } catch {
      return full;
    }
  };

  const sources = useMemo(() => {
    const s = new Set(["all"]);
    for (const t of timeline) s.add(t.source || "unknown");
    // extra virtual filters
    s.add("network:chat");
    s.add("network:auth");
    s.add("network:firestore");
    s.add("non-network");
    return Array.from(s);
  }, [timeline]);

  const rows = useMemo(() => {
    const items = timeline.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (filter === "all") return items;

    if (filter === "network:chat") {
      return items.filter((x) => x.kind === "network" && (x.url || "").includes("/api/chat"));
    }
    if (filter === "network:auth") {
      return items.filter(
        (x) =>
          x.kind === "network" &&
          ((x.url || "").includes("/v1/client/sessions") || (x.url || "").includes("touch?__clerk_api_version")),
      );
    }
    if (filter === "network:firestore") {
      return items.filter((x) => x.kind === "network" && (x.url || "").includes("google.firestore.v1.Firestore"));
    }
    if (filter === "non-network") {
      return items.filter((x) => x.kind !== "network");
    }

    // default: by source label
    return items.filter((x) => (x.source || "unknown") === filter);
  }, [timeline, filter]);

  const statusColor = (status) => {
    if (!status && status !== 0) return "#cccccc";
    if (status >= 200 && status < 300) return "#4ade80"; // green
    if (status >= 400 && status < 500) return "#fbbf24"; // amber
    if (status >= 500) return "#f97373"; // red-ish
    return "#a5b4fc"; // blue-ish default
  };

  return (
    <div style={{ border: "1px solid #222", background: "#141414", padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>Agent Execution Timeline</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{rows.length} events (total {timeline.length})</div>
        </div>
        <button
          onClick={clearTimeline}
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
          Clear
        </button>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Filter:</div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "100%",
            background: "#0f0f0f",
            color: "white",
            border: "1px solid #2a2a2a",
            padding: "6px 8px",
          }}
        >
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          marginTop: 10,
          // Let this panel grow naturally; outer sidebar will scroll if needed.
          overflowY: "auto",
          borderTop: "1px solid #222",
          paddingTop: 8,
        }}
      >
        {rows.length === 0 ? (
          <div style={{ opacity: 0.7, fontSize: 12 }}>No events yet. Trigger any feature action.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((evt, idx) => (
              <li key={`${evt.ts || 0}-${idx}`} style={{ border: "1px solid #1f1f1f", borderRadius: 8, padding: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    <b>{evt.source || "unknown"}</b> · {evt.kind || "event"}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    {evt.ts ? new Date(evt.ts).toLocaleTimeString() : ""}
                  </div>
                </div>
                {evt.kind === "network" ? (
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    <div style={{ opacity: 0.9 }}>
                      {evt.message || compactUrl(evt.url)}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 999,
                          border: "1px solid #333",
                          background: "#0b0f0b",
                          color: statusColor(evt.status),
                        }}
                      >
                        <b>{evt.status}</b>
                      </span>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 999,
                          border: "1px solid #333",
                          background: "#111827",
                          color: "#e5e7eb",
                        }}
                      >
                        {evt.mimeType}
                      </span>
                      {evt.url && (
                        <span style={{ fontSize: 11, opacity: 0.7 }}>{compactUrl(evt.url)}</span>
                      )}
                    </div>
                    {evt.bodySnippet && (
                      <pre
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          whiteSpace: "pre-wrap",
                          maxHeight: 120,
                          overflow: "auto",
                          background: "#101010",
                          borderRadius: 6,
                          padding: 6,
                          border: "1px solid #222",
                        }}
                      >
                        {evt.bodySnippet}
                      </pre>
                    )}
                  </div>
                ) : (
                  evt.message && <div style={{ marginTop: 4, fontSize: 12 }}>{evt.message}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

