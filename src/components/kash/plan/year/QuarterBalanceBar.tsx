"use client";

import { categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

type Props = {
  weights: Record<ProjectCategory, number>;
};

export default function QuarterBalanceBar({ weights }: Props) {
  const total = PROJECT_CATEGORIES.reduce((sum, category) => sum + weights[category], 0);
  if (total === 0) {
    return (
      <div
        className="mt-3 h-[7px] rounded-full bg-surface-2"
        role="img"
        aria-label="No activity recorded this quarter yet"
      />
    );
  }

  return (
    <div
      className="mt-3 flex h-[7px] overflow-hidden rounded-full"
      role="img"
      aria-label="Quarter balance by category"
    >
      {PROJECT_CATEGORIES.map((category) => {
        const weight = weights[category];
        if (weight <= 0) return null;
        return (
          <span
            key={category}
            style={{
              flexGrow: weight,
              backgroundColor: categorySolidVar(category),
              boxShadow: "0 0 0 1px var(--mark-ring)",
            }}
          />
        );
      })}
    </div>
  );
}
