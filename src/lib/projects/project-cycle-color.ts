import type { ProjectCategory } from "./categories";
import { categorySolidVar } from "./category-tokens";

/**
 * D17 — Multi-project calendar hues rotate the existing Apple palette
 * (five category solids + reserved yellow). No bespoke project palette; calendar
 * bars cycle through these tokens so adjacent projects stay distinguishable.
 *
 * Category stripes on cards/rows still use `categorySolidVar`; calendar bars use
 * `projectCycleSolidVar` with an optional +1 offset when the cycle would match
 * the project's own category solid (cheap collision dodge per P5).
 */
export const PROJECT_CYCLE_SOLIDS = [
  "var(--cat-professional-solid)",
  "var(--cat-personal-solid)",
  "var(--cat-relationships-solid)",
  "var(--cat-adulting-solid)",
  "var(--cat-body-mind-solid)",
  "var(--reserved-yellow-solid)",
] as const;

export function projectCycleSolidVar(projectIndex: number): string {
  const len = PROJECT_CYCLE_SOLIDS.length;
  const index = ((projectIndex % len) + len) % len;
  return PROJECT_CYCLE_SOLIDS[index]!;
}

/** Calendar bar color — skips the project's category solid when they'd collide. */
export function projectCalendarSolidVar(projectIndex: number, category: ProjectCategory): string {
  const base = projectCycleSolidVar(projectIndex);
  if (base === categorySolidVar(category)) {
    return projectCycleSolidVar(projectIndex + 1);
  }
  return base;
}
