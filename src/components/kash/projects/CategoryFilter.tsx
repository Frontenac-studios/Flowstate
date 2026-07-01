"use client";

import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

export type CategoryFilterValue = ProjectCategory | "all";

type Props = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
};

export default function CategoryFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      <button
        type="button"
        onClick={() => onChange("all")}
        aria-pressed={value === "all"}
        className={`rounded-chip border px-3 py-1 text-sm transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
          value === "all"
            ? "border-accent bg-accent text-accent-on"
            : "border-subtle text-ink-muted hover:text-ink"
        }`}
      >
        All
      </button>
      {PROJECT_CATEGORIES.map((category) => {
        const active = value === category;
        return (
          <button
            key={category}
            type="button"
            // Clicking the active chip clears back to "all".
            onClick={() => onChange(active ? "all" : category)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-chip border px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
              active ? "border-transparent" : "border-subtle text-ink-muted hover:text-ink"
            }`}
            style={
              active
                ? {
                    backgroundColor: categoryFillVar(category),
                    color: categoryTextVar(category),
                  }
                : undefined
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: categorySolidVar(category),
                boxShadow: "0 0 0 1px var(--mark-ring)",
              }}
              aria-hidden
            />
            {categorySeedLabel(category)}
          </button>
        );
      })}
    </div>
  );
}
