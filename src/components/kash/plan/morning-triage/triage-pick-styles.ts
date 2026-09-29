import type { CSSProperties } from "react";

import type { ProjectCategory } from "@/lib/projects/categories";
import { categoryFillVar, categorySolidVar } from "@/lib/projects/category-tokens";

export const TRIAGE_CHIP_PRIMARY =
  "rounded-pill border-emphasis border-ink px-2.5 py-0.5 text-caption text-ink transition hover:bg-tint-hover disabled:cursor-not-allowed disabled:opacity-50";

export const TRIAGE_CHIP_SECONDARY =
  "rounded-pill border border-border px-2.5 py-0.5 text-caption text-ink transition hover:bg-tint-hover disabled:cursor-not-allowed disabled:opacity-50";

export const TRIAGE_CHIP_MUTED =
  "rounded-pill border border-border px-2.5 py-0.5 text-caption text-ink-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

export function triageCategoryRowTint(
  category: ProjectCategory | null | undefined
): CSSProperties | undefined {
  if (category == null) return undefined;
  return {
    borderLeft: `3px solid ${categorySolidVar(category)}`,
    backgroundColor: categoryFillVar(category),
  };
}
