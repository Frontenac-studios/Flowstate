import { PROJECT_CATEGORIES, PROJECT_CATEGORY_META, type ProjectCategory } from "./categories";

// Phase 1 (1E / Q3): the editable shape of a user's per-category settings. Labels and
// sort order are user-overridable here; color stays with Design Tokens and weeklyTarget
// is schema-only until Week/review, so neither is editable in Phase 1 — they ride along
// read-only for completeness.
export type CategorySettingView = {
  category: ProjectCategory;
  /** Effective display label: the user's override, or the seed label fallback. */
  label: string;
  /** The raw stored override (null = falling back to the seed label). */
  labelOverride: string | null;
  sortOrder: number;
};

export const MAX_CATEGORY_LABEL_LENGTH = 40;

/** Seed label for a category (pre-override fallback, also the editor's reset target). */
export function defaultCategoryLabel(category: ProjectCategory): string {
  return PROJECT_CATEGORY_META[category].label;
}

/** Seed sort order: the canonical order categories are declared in. */
export function defaultCategorySortOrder(category: ProjectCategory): number {
  return PROJECT_CATEGORIES.indexOf(category);
}

/** Resolve a possibly-overridden label to what should actually be shown. */
export function effectiveCategoryLabel(
  category: ProjectCategory,
  labelOverride: string | null
): string {
  const trimmed = labelOverride?.trim();
  return trimmed ? trimmed : defaultCategoryLabel(category);
}
