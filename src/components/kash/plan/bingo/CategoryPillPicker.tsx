"use client";

import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

type Props = {
  value: ProjectCategory | null;
  onChange: (category: ProjectCategory) => void;
  /** Optional legend for fieldset; omit for compact popover use. */
  legend?: string;
  className?: string;
};

export default function CategoryPillPicker({
  value,
  onChange,
  legend = "Category",
  className,
}: Props) {
  return (
    <fieldset className={className ?? "flex flex-col gap-1.5"}>
      {legend ? <legend className="mb-1 text-caption font-medium text-ink">{legend}</legend> : null}
      <div className="flex flex-wrap gap-2">
        {PROJECT_CATEGORIES.map((cat) => {
          const selected = value === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              aria-pressed={selected}
              className={`flex items-center gap-1.5 rounded-chip border px-3 py-1 text-caption font-medium transition ${
                selected ? "border-transparent" : "border-subtle text-ink-muted hover:text-ink"
              }`}
              style={
                selected
                  ? {
                      backgroundColor: categoryFillVar(cat),
                      color: categoryTextVar(cat),
                    }
                  : undefined
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: categorySolidVar(cat) }}
                aria-hidden
              />
              {categorySeedLabel(cat)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
