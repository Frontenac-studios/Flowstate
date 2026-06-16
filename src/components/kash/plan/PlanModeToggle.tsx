"use client";

import { usePlanMode } from "./PlanProvider";

/**
 * Day/Week segmented control for the Today surface. Relocated out of the global
 * header (which is now neutral) into Today's own content — a step toward the
 * reusable in-page switcher.
 */
export function PlanModeToggle() {
  const { mode, setMode } = usePlanMode();

  return (
    <div className="glass-pill flex text-sm" role="group" aria-label="Plan mode">
      <button
        type="button"
        onClick={() => setMode("day")}
        className={`rounded-full px-3 py-1 transition ${
          mode === "day" ? "bg-kash-accent text-white" : "text-kash-ink-muted hover:text-kash-ink"
        }`}
        aria-pressed={mode === "day"}
      >
        Day
      </button>
      <button
        type="button"
        onClick={() => setMode("week")}
        className={`rounded-full px-3 py-1 transition ${
          mode === "week" ? "bg-kash-accent text-white" : "text-kash-ink-muted hover:text-kash-ink"
        }`}
        aria-pressed={mode === "week"}
      >
        Week
      </button>
    </div>
  );
}
