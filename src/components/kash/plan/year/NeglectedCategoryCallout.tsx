"use client";

import { categorySeedLabel } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";

type Props = {
  categories: ProjectCategory[];
  scope?: "year" | "quarter";
};

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export default function NeglectedCategoryCallout({ categories, scope = "year" }: Props) {
  if (categories.length === 0) return null;

  const labels = categories.map((c) => categorySeedLabel(c).toLowerCase());
  const period = scope === "year" ? "this year" : "this quarter";

  return (
    <p className="text-sm text-ink-muted" role="note">
      {joinLabels(labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)))} look
      {categories.length === 1 ? "s" : ""} light {period}.
    </p>
  );
}
