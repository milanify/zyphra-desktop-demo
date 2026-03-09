import { useCallback, useEffect, useMemo, useState } from "react";
import { getElectronAPI } from "./electronBridge";

// Simple shared timeline store so events persist even when hooks unmount/remount.
let globalTimeline = [];
const timelineSubscribers = new Set();
let ipcTimelineBound = false;

const pushTimelineEvent = (evt) => {
  globalTimeline = [evt, ...globalTimeline].slice(0, 500);
  for (const fn of timelineSubscribers) {
    try {
      fn(globalTimeline);
    } catch {
      // ignore subscriber errors
    }
  }
};

export function estimateTokens(text) {
  // Rough demo heuristic: ~4 chars/token for English-like text.
  const s = String(text || "");
  return Math.ceil(s.length / 4);
}

export function useZyphraBridge({ source }) {
  const api = useMemo(() => getElectronAPI(), []);
  const [timeline, setTimeline] = useState(globalTimeline);

  // Keep local state in sync with shared store.
  useEffect(() => {
    timelineSubscribers.add(setTimeline);
    // Ensure we start with the latest snapshot.
    setTimeline(globalTimeline);
    return () => {
      timelineSubscribers.delete(setTimeline);
    };
  }, []);

  // Bind IPC listener once for the entire app lifetime.
  useEffect(() => {
    if (!api?.agent?.onTimeline) return;
    if (ipcTimelineBound) return;
    api.agent.onTimeline((evt) => {
      pushTimelineEvent(evt);
    });
    ipcTimelineBound = true;
  }, [api]);

  const setDraft = useCallback(
    async ({ text, mode = "replace" }) => {
      if (!api?.zyphra?.setDraft) throw new Error("electronAPI not available");
      return await api.zyphra.setDraft({ source, text, mode });
    },
    [api, source],
  );

  const submit = useCallback(async () => {
    if (!api?.zyphra?.submit) throw new Error("electronAPI not available");
    return await api.zyphra.submit({ source });
  }, [api, source]);

  const send = useCallback(
    async ({ text, mode = "replace", timeoutMs }) => {
      if (!api?.zyphra?.send) throw new Error("electronAPI not available");
      return await api.zyphra.send({ source, text, mode, timeoutMs });
    },
    [api, source],
  );

  const openFile = useCallback(
    async ({ filters } = {}) => {
      if (!api?.dialog?.openFile) throw new Error("electronAPI not available");
      return await api.dialog.openFile({ filters, source });
    },
    [api, source],
  );

  const readFile = useCallback(
    async ({ path }) => {
      if (!api?.fs?.readFile) throw new Error("electronAPI not available");
      return await api.fs.readFile({ path, source });
    },
    [api, source],
  );

  const readPdfText = useCallback(
    async ({ path }) => {
      if (!api?.fs?.readPdfText) throw new Error("electronAPI not available");
      return await api.fs.readPdfText({ path, source });
    },
    [api, source],
  );

  return {
    available: !!api,
    timeline,
    setDraft,
    send,
    submit,
    openFile,
    readFile,
    readPdfText,
    clearTimeline: () => {
      globalTimeline = [];
      for (const fn of timelineSubscribers) {
        try {
          fn(globalTimeline);
        } catch {
          // ignore
        }
      }
    },
  };
}

