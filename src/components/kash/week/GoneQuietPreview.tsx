"use client";

import type { SweepAltitude, SweepDraft } from "@/lib/sweep/sweep";

const ALTITUDE_LABEL: Record<SweepAltitude, string> = {
  task: "tasks",
  project: "projects",
  target: "targets",
};

/**
 * W7 → W14 latent hook. The "Gone quiet" preview named in the Week steering deck:
 * a read-only glance at what has gone stale (by name, every altitude) whose button
 * opens the Sweep ritual. Built now so the W14 deck and the Friday review can embed
 * it unchanged; NOT rendered in the W7 cut (the Sweep's own entry lives in
 * `SweepPanel`). Presentational — it takes a `SweepDraft` and an open callback, no
 * data-fetching of its own.
 */
export function GoneQuietPreview({
  draft,
  onOpenSweep,
  limit = 5,
}: {
  draft: SweepDraft;
  onOpenSweep: () => void;
  limit?: number;
}) {
  if (draft.totalStale === 0) return null;

  const shown = draft.items.slice(0, limit);
  const rest = draft.totalStale - shown.length;

  return (
    <button
      type="button"
      onClick={onOpenSweep}
      className="flex w-full flex-col gap-1.5 rounded-card border border-border bg-surface p-3 text-left shadow-surface transition hover:border-ink-faint"
      aria-label={`Gone quiet: ${draft.totalStale} items. Open the Sweep.`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
          Gone quiet
        </span>
        <span className="text-caption text-ink-faint">{draft.totalStale} →</span>
      </span>
      <ul className="flex flex-col gap-0.5">
        {shown.map((item) => (
          <li
            key={`${item.altitude}:${item.id}`}
            className="flex items-baseline justify-between gap-2 text-sm text-ink"
          >
            <span className="min-w-0 truncate">{item.title}</span>
            <span className="shrink-0 text-caption text-ink-faint">
              {ALTITUDE_LABEL[item.altitude]} · {item.staleDays}d
            </span>
          </li>
        ))}
      </ul>
      {rest > 0 ? <span className="text-caption text-ink-faint">+{rest} more</span> : null}
    </button>
  );
}
