"use client";

import { useRouter } from "next/navigation";

import { usePlanMode } from "./PlanProvider";

export function MondayEntryModal() {
  const router = useRouter();
  const { mondayBlocked, resolveMondayChoice } = usePlanMode();

  if (!mondayBlocked) return null;

  // Week planning now lives on its own route (This Week); record the Monday
  // choice (so the prompt doesn't reappear) and hand off there.
  const planTheWeek = () => {
    resolveMondayChoice("week");
    router.push("/this-week");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="monday-entry-title"
    >
      <div className="max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-lg shadow-overlay">
        <h2 id="monday-entry-title" className="text-xl font-semibold text-ink">
          Good morning — plan the week or dive into today?
        </h2>
        <p className="mt-3 text-sm text-ink-muted">
          Choose how you want to start Monday. You can switch anytime from the sidebar.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="rounded-pill border-[1.5px] border-ink bg-surface px-6 py-2.5 text-sm font-medium text-ink transition hover:bg-[var(--accent-soft)]"
            onClick={planTheWeek}
          >
            Plan the week
          </button>
          <button
            type="button"
            className="rounded-pill border border-border bg-surface px-6 py-2.5 text-sm text-ink-muted transition hover:text-ink"
            onClick={() => resolveMondayChoice("today")}
          >
            Jump into today
          </button>
        </div>
      </div>
    </div>
  );
}
