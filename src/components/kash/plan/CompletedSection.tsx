"use client";

import { useId, useState } from "react";

import { categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";

const NEUTRAL_CHECK = "rgba(120,120,120,0.45)";

export type CompletedTaskRow = {
  id: string;
  title: string;
  completedAt: Date;
  category: ProjectCategory;
  categoryUnresolved: boolean;
};

function completedTime(at: Date): string {
  return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type Props = {
  completions: CompletedTaskRow[];
};

/**
 * AN-T1b: the persistent "Completed · n" tail of the Today list. Completed rows
 * settle here and stay all day; the section clears itself at the local-midnight
 * rollover because its feed is filtered on the local day upstream. Collapsed by
 * default, with a manual toggle — the day's record is there without crowding the
 * live list.
 */
export function CompletedSection({ completions }: Props) {
  const regionId = useId();
  const [collapsed, setCollapsed] = useState(true);

  if (completions.length === 0) return null;

  const showBody = !collapsed;

  return (
    <section className="mt-6" aria-labelledby={`${regionId}-heading`}>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-card px-1 py-1 text-left"
        aria-expanded={showBody}
        aria-controls={regionId}
        onClick={() => setCollapsed((v) => !v)}
      >
        <svg
          className={`h-3.5 w-3.5 text-ink-faint transition-transform duration-short ease-enter motion-reduce:transition-none ${
            showBody ? "rotate-90" : ""
          }`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4.5 3l3 3-3 3" />
        </svg>
        <span
          id={`${regionId}-heading`}
          className="text-sm font-medium uppercase tracking-wide text-ink-muted"
        >
          Completed
        </span>
        <span className="text-sm text-ink-faint">· {completions.length}</span>
      </button>

      <ul id={regionId} hidden={!showBody} className="mt-3 space-y-2">
        {completions.map((task) => {
          const resolved = task.categoryUnresolved ? null : task.category;
          const checkColor = resolved ? categorySolidVar(resolved) : NEUTRAL_CHECK;
          const label = resolved ? categoryLabel(resolved) : "No category yet";
          return (
            <li
              key={task.id}
              className="flex min-h-[var(--row-min-height)] items-start gap-2 rounded-card border border-subtle bg-surface px-3 py-[var(--row-py)]"
            >
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-white"
                style={{ backgroundColor: checkColor }}
                aria-label={label}
                title={label}
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 break-words text-ink-faint line-through">
                {task.title}
              </span>
              <span className="mt-0.5 shrink-0 self-start text-xs text-ink-faint">
                {completedTime(task.completedAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
