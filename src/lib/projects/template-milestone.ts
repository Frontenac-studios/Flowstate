import type { ProjectCategory } from "@/lib/projects/categories";

/** Minimum active projects before template/similarity features surface. */
export const TEMPLATE_FEATURES_MIN_PROJECTS = 10;

export function hasTemplateFeatures(projectCount: number): boolean {
  return projectCount >= TEMPLATE_FEATURES_MIN_PROJECTS;
}

const CROSS_CATEGORY_PAIR = new Set<ProjectCategory>(["professional", "personal_projects"]);

/**
 * Whether a past project may be suggested as "like this past one" when creating
 * in `targetCategory`. Same category always allowed; cross-category only
 * professional ↔ personal_projects.
 */
export function isSimilarCategoryAllowed(
  targetCategory: ProjectCategory,
  candidateCategory: ProjectCategory
): boolean {
  if (targetCategory === candidateCategory) return true;
  return CROSS_CATEGORY_PAIR.has(targetCategory) && CROSS_CATEGORY_PAIR.has(candidateCategory);
}
