"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { computeCategoryBalance, type CategoryBalanceSegment } from "@/lib/tasks/category-balance";

type BalanceTask = {
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
  isTop3?: boolean;
};

const UNCATEGORISED_COLOR = "var(--ink-faint)";

/** A faint diagonal hatch marking a life-area with nothing planned today. */
const EMPTY_HATCH = "repeating-linear-gradient(45deg, var(--ink-faint) 0 1px, transparent 1px 4px)";

function segmentColor(segment: CategoryBalanceSegment): string {
  return segment.category ? categorySolidVar(segment.category) : UNCATEGORISED_COLOR;
}

function segmentLabel(segment: CategoryBalanceSegment): string {
  return segment.category ? categorySeedLabel(segment.category) : "No category";
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * Today's life-area balance: a single segmented bar (each slice sized by the
 * day's Top-3-weighted task load for that category) plus a compact legend.
 * Colours come from the `--cat-*-solid` tokens so user category-colour overrides
 * apply. Life-areas with nothing planned show as thin hatched slivers, and a
 * lopsided day (one area dominant while others sit empty) gets a gentle, non-
 * alarming nudge — calm and encouraging, not a scoreboard. Renders nothing when
 * the day is empty.
 */
export function BalanceBar({ tasks }: { tasks: ReadonlyArray<BalanceTask> }) {
  const { segments, emptyCategories, totalTasks, dominant, lopsided } =
    computeCategoryBalance(tasks);
  if (totalTasks === 0) return null;

  const present = segments.map((s) => `${s.taskCount} ${segmentLabel(s).toLowerCase()}`).join(", ");
  const emptyLabels = emptyCategories.map((c) => categorySeedLabel(c));
  const ariaLabel = lopsided
    ? `Today's balance: ${present}; nothing planned for ${joinLabels(emptyLabels)}`
    : `Today's balance: ${present}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-2 min-w-0 flex-1 overflow-hidden rounded-full"
          role="img"
          aria-label={ariaLabel}
        >
          {segments.map((segment) => (
            <span
              key={segment.category ?? "none"}
              className="transition-[flex-grow] duration-medium ease-move motion-reduce:transition-none"
              style={{
                flexGrow: segment.weight,
                backgroundColor: segmentColor(segment),
                boxShadow: "0 0 0 1px var(--mark-ring)",
              }}
              title={`${segmentLabel(segment)} · ${segment.taskCount}`}
            />
          ))}
          {emptyCategories.map((category) => (
            <span
              key={`empty-${category}`}
              className="w-2 shrink-0"
              style={{ backgroundImage: EMPTY_HATCH }}
              title={`${categorySeedLabel(category)} · nothing planned`}
            />
          ))}
        </div>
        {dominant ? (
          <span className="shrink-0 text-meta text-ink-muted">
            mostly {categorySeedLabel(dominant).toLowerCase()}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-hidden>
          {segments.map((segment) => (
            <li key={segment.category ?? "none"} className="flex items-center gap-1.5 text-meta">
              <span
                className="size-2 shrink-0 rounded-sm shadow-[0_0_0_1px_var(--mark-ring)]"
                style={{ backgroundColor: segmentColor(segment) }}
              />
              <span className="text-ink-muted">
                {segmentLabel(segment)} {segment.taskCount}
              </span>
            </li>
          ))}
        </ul>
        {lopsided ? (
          <p className="text-meta text-ink-muted" role="note">
            Light on {joinLabels(emptyLabels.map((l) => l.toLowerCase()))} today.
          </p>
        ) : null}
      </div>
    </div>
  );
}
