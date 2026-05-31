"use client";

import {
  PROJECT_CATEGORIES,
  PROJECT_CATEGORY_META,
  type ProjectCategory,
} from "@/lib/projects/categories";

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
        className={`glass-pill px-3 py-1 text-sm transition ${
          value === "all" ? "bg-kash-accent text-white" : "text-kash-ink-muted hover:text-kash-ink"
        }`}
      >
        All
      </button>
      {PROJECT_CATEGORIES.map((category) => {
        const meta = PROJECT_CATEGORY_META[category];
        const active = value === category;
        return (
          <button
            key={category}
            type="button"
            // Clicking the active chip clears back to "all".
            onClick={() => onChange(active ? "all" : category)}
            aria-pressed={active}
            className="rounded-full border px-3 py-1 text-sm font-medium transition"
            style={
              active
                ? { backgroundColor: meta.color, borderColor: meta.color, color: "#fff" }
                : {
                    backgroundColor: `${meta.color}1f`,
                    borderColor: "transparent",
                    color: meta.color,
                  }
            }
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
