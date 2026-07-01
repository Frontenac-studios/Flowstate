"use client";

import { priorityMeta } from "@/lib/tasks/priority";

/** High → None, the order the urgency ramp reads. */
const LEVELS = [3, 2, 1, 0] as const;

type Props = {
  value: ReadonlySet<number>;
  onToggle: (level: number) => void;
};

/**
 * The Projects priority lens (VF-4c): a header chip control that filters Miller
 * tasks to the selected priority levels. Clean by default (nothing selected =
 * all tasks); priority pips on the rows stay always-on, so this is filter-only.
 */
export default function MillerPriorityFilter({ value, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1.5 text-xs" role="group" aria-label="Filter by priority">
      <span className="text-ink-muted">Priority</span>
      {LEVELS.map((level) => {
        const meta = priorityMeta(level);
        const active = value.has(level);
        return (
          <button
            key={level}
            type="button"
            onClick={() => onToggle(level)}
            aria-pressed={active}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
              active
                ? "border-accent bg-accent text-white"
                : "border-white/30 text-ink-muted hover:text-ink"
            }`}
          >
            {meta.dots > 0 ? (
              <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : meta.dotClass}`}
                aria-hidden
              />
            ) : null}
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
