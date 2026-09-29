import type { ProjectCategory } from "./categories";

/**
 * Multi-project hues (Spec v2): calendar bars and phase stripes cycle through the
 * eight project solids, so adjacent projects stay distinguishable. Personal purple
 * is not in the cycle — it is reserved for the personal project.
 *
 * Category stripes on cards/rows still use `categorySolidVar`; calendar bars use
 * `projectCalendarSolidVar`, which skips the one cycle hue a category stripe
 * shares so a bar never matches its own project's stripe.
 */
export const PROJECT_CYCLE_SOLIDS = [
  "var(--project-1-solid)",
  "var(--project-2-solid)",
  "var(--project-3-solid)",
  "var(--project-4-solid)",
  "var(--project-5-solid)",
  "var(--project-6-solid)",
  "var(--project-7-solid)",
  "var(--project-8-solid)",
] as const;

/**
 * The cycle hue each category stripe renders as. Business blue is --project-1's
 * hue; personal purple sits outside the cycle, so it never collides.
 */
const CATEGORY_CYCLE_HUE: Record<ProjectCategory, string | null> = {
  business: "var(--project-1-solid)",
  personal: null,
};

export function projectCycleSolidVar(projectIndex: number): string {
  const len = PROJECT_CYCLE_SOLIDS.length;
  const index = ((projectIndex % len) + len) % len;
  return PROJECT_CYCLE_SOLIDS[index]!;
}

/** Calendar bar color — skips the project's category hue when they'd collide. */
export function projectCalendarSolidVar(projectIndex: number, category: ProjectCategory): string {
  const base = projectCycleSolidVar(projectIndex);
  if (base === CATEGORY_CYCLE_HUE[category]) {
    return projectCycleSolidVar(projectIndex + 1);
  }
  return base;
}
