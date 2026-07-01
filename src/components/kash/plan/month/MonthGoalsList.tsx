"use client";

import type { MonthGoalFields } from "@/lib/planning/month-goals";
import { categorySolidVar } from "@/lib/projects/category-tokens";

type Props = {
  goals: MonthGoalFields[];
};

export default function MonthGoalsList({ goals }: Props) {
  if (goals.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-4">
      <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
        Goals this month
      </h3>
      <ul className="flex flex-col gap-1.5">
        {goals.map((goal) => (
          <li
            key={goal.id}
            className="flex items-center gap-2 rounded-control border border-subtle bg-surface-2 px-3 py-2 text-sm text-ink"
          >
            <span
              className="h-4 w-0.5 shrink-0 rounded-full"
              style={{ backgroundColor: categorySolidVar(goal.category) }}
              aria-hidden
            />
            <span className="truncate">{goal.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
