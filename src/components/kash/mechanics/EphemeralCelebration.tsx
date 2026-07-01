"use client";

import { useEffect, useState } from "react";

export type EphemeralCelebrationKind = "focus-done" | "top3-complete";

let triggerHandler: ((kind: EphemeralCelebrationKind) => void) | null = null;

export function triggerEphemeralCelebration(kind: EphemeralCelebrationKind): void {
  triggerHandler?.(kind);
}

const COPY: Record<EphemeralCelebrationKind, string> = {
  "focus-done": "Nice focus",
  "top3-complete": "Top 3 complete",
};

export function EphemeralCelebrationHost() {
  const [active, setActive] = useState<EphemeralCelebrationKind | null>(null);

  useEffect(() => {
    triggerHandler = (kind) => setActive(kind);
    return () => {
      triggerHandler = null;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const timerId = window.setTimeout(() => setActive(null), 1200);
    return () => window.clearTimeout(timerId);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="ephemeral-celebration pointer-events-none fixed inset-0 z-toast flex items-center justify-center"
      aria-hidden
    >
      <span className="rounded-pill border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-overlay">
        {COPY[active]}
      </span>
    </div>
  );
}
