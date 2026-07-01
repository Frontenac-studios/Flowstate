"use client";

import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { YearHeatWeek } from "@/lib/planning/year-heat";

type Props = {
  weeks: YearHeatWeek[];
};

export default function QuarterWeekDots({ weeks }: Props) {
  if (weeks.length === 0) return null;

  return (
    <div className="mt-3 flex gap-0.5 overflow-x-auto pb-0.5" aria-label="Weekly activity dots">
      {weeks.map((week) => (
        <span
          key={week.weekStart}
          className="size-2 shrink-0 rounded-[var(--radius-row)] shadow-[0_0_0_1px_var(--mark-ring)]"
          style={{
            backgroundColor: week.dominantCategory
              ? categorySolidVar(week.dominantCategory)
              : "var(--ink-faint)",
          }}
          title={
            week.dominantCategory
              ? `Week of ${week.weekStart}`
              : `Week of ${week.weekStart} · no activity`
          }
        />
      ))}
    </div>
  );
}
