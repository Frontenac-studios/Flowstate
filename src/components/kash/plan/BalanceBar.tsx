"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { computeCategoryBalance, type CategoryBalanceSegment } from "@/lib/tasks/category-balance";

type BalanceTask = {
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
};

const UNCATEGORISED_COLOR = "var(--ink-faint)";

function segmentColor(segment: CategoryBalanceSegment): string {
  return segment.category ? categorySolidVar(segment.category) : UNCATEGORISED_COLOR;
}

function segmentLabel(segment: CategoryBalanceSegment): string {
  return segment.category ? categorySeedLabel(segment.category) : "No category";
}

/**
 * Today's life-area balance: a single segmented bar (each slice sized by the
 * day's task count for that category) plus a compact legend. Colours come from
 * the `--cat-*-solid` tokens so user category-colour overrides apply. Renders
 * nothing when the day is empty.
 */
export function BalanceBar({ tasks }: { tasks: ReadonlyArray<BalanceTask> }) {
  const { segments, total } = computeCategoryBalance(tasks);
  if (total === 0) return null;

  const summary = segments.map((s) => `${s.count} ${segmentLabel(s).toLowerCase()}`).join(", ");

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div
        className="flex h-2 min-w-0 flex-1 overflow-hidden rounded-full"
        role="img"
        aria-label={`Today's balance: ${summary}`}
      >
        {segments.map((segment) => (
          <span
            key={segment.category ?? "none"}
            style={{ flexGrow: segment.count, backgroundColor: segmentColor(segment) }}
            title={`${segmentLabel(segment)} · ${segment.count}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-hidden>
        {segments.map((segment) => (
          <li key={segment.category ?? "none"} className="flex items-center gap-1.5 text-meta">
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: segmentColor(segment) }}
            />
            <span className="text-ink-muted">
              {segmentLabel(segment)} {segment.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
