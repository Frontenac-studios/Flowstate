/** Multi-project calendar project-mode coloring (DT-8). */
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
