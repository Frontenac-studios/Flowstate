import { and, eq, type SQL } from "drizzle-orm";

import { projects } from "@/db/tables";

/**
 * The goal layer never sees maintenance projects.
 *
 * MISSION.md: a project tagged Maintenance "requires no goal" and is "excluded
 * from the entire goal layer: no targets, no progress, no reviews, no nagging."
 * This is the single seam every goal-layer query goes through so the rule is
 * enforced in one place instead of re-derived per call site. W5's Target-progress
 * queries compose this predicate; W1 tests it against a real query.
 */

/** Drizzle predicate: a project eligible to appear in the goal layer. */
export function goalLayerProjectCondition(): SQL {
  // Non-null assertion: `and` returns undefined only for an empty argument list.
  return and(eq(projects.isMaintenance, false))!;
}

/** Pure filter for in-memory project lists (progress rollups, target linking). */
export function selectGoalLayerProjects<T extends { isMaintenance: boolean }>(
  rows: readonly T[]
): T[] {
  return rows.filter((row) => !row.isMaintenance);
}

/** True when a project may be linked to a target or counted toward its progress. */
export function isGoalLayerEligible(project: { isMaintenance: boolean }): boolean {
  return !project.isMaintenance;
}
