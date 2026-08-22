"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

type Props = {
  balance: Record<ProjectCategory, number>;
};

/**
 * Category balance as a silent single bar: one slice per non-empty category,
 * width proportional to its share of goals. No labels — category + count live
 * in the hover/focus tooltip. With no goals yet the empty track shows alone.
 */
export default function CategoryBalanceChart({ balance }: Props) {
  return (
    <div
      className="flex h-1.5 gap-px overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
      aria-label="Category balance"
    >
      {PROJECT_CATEGORIES.filter((category) => balance[category] > 0).map((category) => {
        const count = balance[category];
        const label = `${categorySeedLabel(category)} · ${count} ${count === 1 ? "goal" : "goals"}`;
        return (
          <span
            key={category}
            title={label}
            aria-label={label}
            className="h-full min-w-0"
            style={{ flexGrow: count, backgroundColor: categorySolidVar(category) }}
          />
        );
      })}
    </div>
  );
}
