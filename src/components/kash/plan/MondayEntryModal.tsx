"use client";

import { usePlanMode } from "./PlanProvider";

export function MondayEntryModal() {
  const { mondayBlocked, resolveMondayChoice } = usePlanMode();

  if (!mondayBlocked) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="monday-entry-title"
    >
      <div className="glass-panel-strong max-w-md p-8 text-center shadow-lg">
        <h2 id="monday-entry-title" className="text-xl font-semibold text-kash-ink">
          Good morning — plan the week or dive into today?
        </h2>
        <p className="mt-3 text-sm text-kash-ink-muted">
          Choose how you want to start Monday. You can switch modes anytime after this.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="glass-pill bg-kash-accent px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            onClick={() => resolveMondayChoice("week")}
          >
            Plan the week
          </button>
          <button
            type="button"
            className="glass-pill px-6 py-2.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
            onClick={() => resolveMondayChoice("today")}
          >
            Jump into today
          </button>
        </div>
      </div>
    </div>
  );
}
