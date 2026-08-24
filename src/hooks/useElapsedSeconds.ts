"use client";

import { useEffect, useState } from "react";

function computeElapsed(startedAtMs: number | null): number {
  if (startedAtMs === null) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
}

/**
 * Live elapsed seconds since `startedAt`, ticking once a second; 0 when null.
 *
 * Elapsed is always derived from the start instant, never accumulated — so the
 * value is correct across tab sleep, clock jumps, and re-mounts (a fresh read of
 * `Date.now() - startedAt`), and the timer "survives" anything short of the row
 * itself changing. The interval only drives re-render; it never sums ticks.
 */
export function useElapsedSeconds(startedAt: Date | null): number {
  const startedAtMs = startedAt ? startedAt.getTime() : null;
  const [seconds, setSeconds] = useState(() => computeElapsed(startedAtMs));

  useEffect(() => {
    setSeconds(computeElapsed(startedAtMs));
    if (startedAtMs === null) return;
    const id = window.setInterval(() => setSeconds(computeElapsed(startedAtMs)), 1000);
    return () => window.clearInterval(id);
  }, [startedAtMs]);

  return seconds;
}
