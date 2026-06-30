"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { formatDuration } from "@/lib/time/duration";
import { useTRPC } from "@/trpc/client";

const DAY_MONTH: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** "Jun 23 – Jun 29": weekEnd is the exclusive next Monday, so show the Sunday. */
function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  const lastDay = new Date(weekEnd.getTime() - 86_400_000);
  return `${weekStart.toLocaleDateString(undefined, DAY_MONTH)} – ${lastDay.toLocaleDateString(
    undefined,
    DAY_MONTH
  )}`;
}

/**
 * Read-only end-of-week roll-up (Phase 2.5, decision B2): total focus time for
 * the current local week, broken down by derived category and by project. No
 * writes, no targets — a thin reflective surface at the top of This Week.
 */
export default function WeeklySummaryCard() {
  const trpc = useTRPC();
  const tzOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);
  const { data } = useQuery(trpc.timeEntries.weeklyRollup.queryOptions({ tzOffsetMinutes }));

  if (!data) return null;

  const { byCategory, byProject, totalSeconds, weekStart, weekEnd } = data;
  const maxCategory = Math.max(...byCategory.map((c) => c.seconds), 1);

  return (
    <section
      className="rounded-card border border-subtle bg-surface p-5"
      aria-label="Weekly focus summary"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          This week
        </span>
        <span className="text-xs text-ink-faint">{formatWeekRange(weekStart, weekEnd)}</span>
      </div>

      {totalSeconds === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No focus time logged this week yet.</p>
      ) : (
        <>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-medium text-ink">{formatDuration(totalSeconds)}</span>
            <span className="text-sm text-ink-muted">focused this week</span>
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            By category
          </p>
          <ul className="mt-2 space-y-3" aria-label="Focus time by category">
            {byCategory.map((row) => (
              <li key={row.category} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-ink">{categorySeedLabel(row.category)}</span>
                  <span className="shrink-0 text-ink-muted">{formatDuration(row.seconds)}</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                    style={{
                      width: `${Math.round((row.seconds / maxCategory) * 100)}%`,
                      backgroundColor: categorySolidVar(row.category),
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            By project
          </p>
          <ul className="mt-2 space-y-2" aria-label="Focus time by project">
            {byProject.map((row) => (
              <li
                key={row.projectId ?? "loose"}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: row.projectId ? "var(--accent)" : "var(--ink-faint)",
                    }}
                  />
                  <span className={`truncate ${row.projectId ? "text-ink" : "text-ink-muted"}`}>
                    {row.projectName ?? "No project"}
                  </span>
                </span>
                <span className="shrink-0 text-ink-muted">{formatDuration(row.seconds)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
