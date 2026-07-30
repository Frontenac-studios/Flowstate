"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

type Props = {
  balance: Record<ProjectCategory, number>;
};

/**
 * Category balance as horizontal bars — one row per category, scaled to the
 * largest count so gaps in the year's mix are visible at a glance.
 */
export default function BingoBalanceChart({ balance }: Props) {
  const max = Math.max(1, ...PROJECT_CATEGORIES.map((category) => balance[category]));

  return (
    <section className="rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-medium text-ink-muted">Balance</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {PROJECT_CATEGORIES.map((category) => {
          const count = balance[category];
          return (
            <li key={category} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-caption text-ink">
                {categorySeedLabel(category)}
              </span>
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
                role="img"
                aria-label={`${categorySeedLabel(category)}: ${count} ${count === 1 ? "goal" : "goals"}`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: categorySolidVar(category),
                    boxShadow: count > 0 ? "0 0 0 1px var(--mark-ring)" : undefined,
                  }}
                />
              </div>
              <span className="w-4 shrink-0 text-right text-caption tabular-nums text-ink-muted">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
