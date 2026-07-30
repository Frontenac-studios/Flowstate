"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

type Props = {
  balance: Record<ProjectCategory, number>;
};

/**
 * Category balance as a silent one-line indicator: one mini column per
 * category in a fixed order, height scaled to the largest count. Empty
 * categories render as faint stubs so gaps in the year's mix stay visible.
 * No labels — category + count live in the hover/focus tooltip.
 */
export default function BingoBalanceChart({ balance }: Props) {
  const max = Math.max(1, ...PROJECT_CATEGORIES.map((category) => balance[category]));

  return (
    <div className="flex h-6 items-end gap-1.5" aria-label="Category balance">
      {PROJECT_CATEGORIES.map((category) => {
        const count = balance[category];
        const label = `${categorySeedLabel(category)} · ${count} ${count === 1 ? "goal" : "goals"}`;
        return (
          <span
            key={category}
            title={label}
            aria-label={label}
            className="min-w-0 flex-1 rounded-t-sm"
            style={
              count > 0
                ? {
                    height: `${Math.max(18, (count / max) * 100)}%`,
                    backgroundColor: categorySolidVar(category),
                  }
                : {
                    height: "3px",
                    backgroundColor: "color-mix(in srgb, var(--ink) 10%, transparent)",
                  }
            }
          />
        );
      })}
    </div>
  );
}
