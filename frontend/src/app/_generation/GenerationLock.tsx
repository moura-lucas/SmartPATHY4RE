"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const GenerationLockContext = createContext<{
  locked: boolean;
  change: (delta: number) => void;
} | null>(null);

const NO_LOCK = { locked: false, change: () => {} };

/** AC11.1: while one generation runs, the screen's other generation actions are disabled. */
export function GenerationLock({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState(0);
  const change = useCallback((delta: number) => setRunning((count) => count + delta), []);
  const value = useMemo(() => ({ locked: running > 0, change }), [running, change]);
  return <GenerationLockContext value={value}>{children}</GenerationLockContext>;
}

export function useGenerationLock() {
  return useContext(GenerationLockContext) ?? NO_LOCK;
}
