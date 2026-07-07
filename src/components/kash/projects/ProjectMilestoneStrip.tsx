"use client";

import { useMemo } from "react";

import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";

import type { ProjectMilestone } from "./types";

type Props = {
  milestones: ProjectMilestone[];
  onEdit: () => void;
};

function formatMonthDay(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Slim strip of project milestones above the board — dated markers sorted soonest-first. */
export default function ProjectMilestoneStrip({ milestones, onEdit }: Props) {
  const todayIso = toISODateString(startOfLocalDay());

  const ordered = useMemo(() => {
    return [...milestones].sort((a, b) => {
      // Undated milestones sink to the end; otherwise soonest date first.
      if (!a.targetDate && !b.targetDate) return a.title.localeCompare(b.title);
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    });
  }, [milestones]);

  if (ordered.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-subtle bg-surface px-3 py-2 shadow-surface">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Milestones</span>
      <ul className="flex flex-wrap items-center gap-1.5">
        {ordered.map((mi) => {
          const done = mi.completedAt !== null;
          const overdue = !done && mi.targetDate !== null && mi.targetDate < todayIso;
          return (
            <li key={mi.id}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-xs ${
                  done
                    ? "border-subtle text-ink-muted line-through"
                    : overdue
                      ? "border-critical/40 text-critical"
                      : "border-subtle text-ink"
                }`}
              >
                <span className="font-medium">{mi.title}</span>
                {mi.targetDate ? (
                  <span className={done ? "text-ink-muted" : "text-ink-muted"}>
                    {formatMonthDay(mi.targetDate)}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onEdit}
        className="ml-auto rounded-control px-2 py-0.5 text-xs text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
      >
        Edit
      </button>
    </div>
  );
}
