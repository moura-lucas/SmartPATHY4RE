"use client";

import { useEffect, useRef, useState } from "react";
import { useLeaveProtection } from "./useLeaveProtection";

/** AC11.2: after this, the elapsed time and the expected duration are shown. */
export const DELAY_THRESHOLD_SECONDS = 20;

export type GenerationStatus = "idle" | "running" | "succeeded" | "failed";

/**
 * State of an AI generation (US11). `run` calls the API and navigates on success;
 * `retry` runs exactly the same request again (AC11.4).
 */
export function useGeneration(run: () => Promise<void>) {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (status !== "running") return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  async function start() {
    if (inFlight.current) return; // AC11.1: no duplicate requests
    inFlight.current = true;
    setStatus("running");
    setError(null);
    setElapsedSeconds(0);
    try {
      await run();
      // Actions stay disabled while navigating, but leaving is no longer a risk.
      setStatus("succeeded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The generation failed. Please try again.");
      setStatus("failed");
      inFlight.current = false;
    }
  }

  const leave = useLeaveProtection(status === "running");

  return {
    status,
    /** True while a generation is running or its result is opening. */
    busy: status === "running" || status === "succeeded",
    error,
    elapsedSeconds,
    start,
    retry: start,
    leave,
  };
}

export type Generation = ReturnType<typeof useGeneration>;
