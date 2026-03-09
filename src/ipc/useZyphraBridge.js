import { useCallback, useEffect, useMemo, useState } from "react";
import { getElectronAPI } from "./electronBridge";

export function estimateTokens(text) {
  // Rough demo heuristic: ~4 chars/token for English-like text.
  const s = String(text || "");
  return Math.ceil(s.length / 4);
}

export function useZyphraBridge({ source }) {
  const api = useMemo(() => getElectronAPI(), []);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    if (!api?.agent?.onTimeline) return;
    const unsub = api.agent.onTimeline((evt) => {
      setTimeline((prev) => [evt, ...prev].slice(0, 200));
    });
    return unsub;
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

  return {
    available: !!api,
    timeline,
    setDraft,
    submit,
    openFile,
    readFile,
  };
}

