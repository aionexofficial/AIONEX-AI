"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AionState } from "@/lib/aion/types";

type AionContextValue = { state: AionState | null; loading: boolean; error: string; refresh: () => Promise<void>; setState: React.Dispatch<React.SetStateAction<AionState | null>> };
const AionContext = createContext<AionContextValue | null>(null);

export function AionProvider({ authenticated, children }: { authenticated: boolean; children: React.ReactNode }) {
  const [state, setState] = useState<AionState | null>(null), [loading, setLoading] = useState(authenticated), [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!authenticated) { setState(null); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/aion/state", { cache: "no-store" });
      const body = await response.json() as { state?: AionState; error?: string };
      if (!response.ok || !body.state) throw new Error(body.error || "AION is unavailable.");
      setState(body.state); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "AION is unavailable."); }
    finally { setLoading(false); }
  }, [authenticated]);
  useEffect(() => { const frame = requestAnimationFrame(() => void refresh()); return () => cancelAnimationFrame(frame); }, [refresh]);
  const value = useMemo(() => ({ state, loading, error, refresh, setState }), [state, loading, error, refresh]);
  return <AionContext.Provider value={value}>{children}</AionContext.Provider>;
}

export function useAion() {
  const value = useContext(AionContext);
  if (!value) throw new Error("useAion must be used within AionProvider.");
  return value;
}
