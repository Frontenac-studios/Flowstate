"use client";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

type Props = {
  balance: Record<ProjectCategory, number>;
};

export default function BingoBalanceLegend({ balance }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-caption text-ink-muted">Balance</span>
      {PROJECT_CATEGORIES.map((category) => (
        <span key={category} className="inline-flex items-center gap-1.5 text-caption text-ink">
          <span
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: categorySolidVar(category) }}
            aria-hidden
          />
          {categorySeedLabel(category)}
          <span className="text-ink-muted">· {balance[category]}</span>
        </span>
      ))}
    </div>
  );
}
