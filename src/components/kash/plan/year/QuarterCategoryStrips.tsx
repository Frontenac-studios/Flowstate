"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

const EMPTY_HATCH = "repeating-linear-gradient(45deg, var(--ink-faint) 0 1px, transparent 1px 4px)";

type Props = {
  weights: Record<ProjectCategory, number>;
};

export default function QuarterCategoryStrips({ weights }: Props) {
  const total = PROJECT_CATEGORIES.reduce((sum, category) => sum + weights[category], 0);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex h-2 overflow-hidden rounded-full"
        role="img"
        aria-label="Category balance for this quarter"
      >
        {PROJECT_CATEGORIES.map((category) => {
          const weight = weights[category];
          if (weight > 0 && total > 0) {
            return (
              <span
                key={category}
                style={{ flexGrow: weight, backgroundColor: categorySolidVar(category) }}
                title={`${categorySeedLabel(category)} · ${weight}`}
              />
            );
          }
          return (
            <span
              key={category}
              className="w-2 shrink-0"
              style={{ backgroundImage: EMPTY_HATCH }}
              title={`${categorySeedLabel(category)} · nothing recorded`}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {PROJECT_CATEGORIES.map((category) => (
          <li key={category} className="flex items-center gap-1.5 text-caption text-ink-muted">
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{
                backgroundColor: weights[category] > 0 ? categorySolidVar(category) : "transparent",
                backgroundImage: weights[category] > 0 ? undefined : EMPTY_HATCH,
              }}
              aria-hidden
            />
            {categorySeedLabel(category)}
            <span>{weights[category] > 0 ? weights[category] : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
