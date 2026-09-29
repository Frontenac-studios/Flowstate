import { and, eq, isNull } from "drizzle-orm";

import type { AppDb } from "@/db";
import type { AppDbTransaction } from "@/db/run-transaction";
import { projects } from "@/db/tables";
import type { ProjectCategory } from "@/lib/projects/categories";
import { isProjectHue, pickNextHue, type ProjectHue } from "@/lib/projects/project-hue";

type Executor = AppDb | AppDbTransaction;

/**
 * The hue to store on a project being created (or switched) into `category`:
 * the next hue for a business project, null for personal (always purple).
 */
export async function hueForNewProject(
  executor: Executor,
  userId: string,
  category: ProjectCategory
): Promise<ProjectHue | null> {
  if (category !== "business") return null;
  const rows = await executor
    .select({ hue: projects.hue })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.category, "business"),
        isNull(projects.archivedAt)
      )
    );
  return pickNextHue(rows.map((r) => r.hue));
}

/**
 * The hue patch for a category change, so the colour rule stays true (and the
 * projects_hue_check constraint holds): personal drops its hue, business keeps a
 * valid one or picks up the next in order. Undefined = leave hue untouched.
 */
export async function huePatchForCategoryChange(
  executor: Executor,
  userId: string,
  current: { category: ProjectCategory; hue: number | null },
  nextCategory: ProjectCategory
): Promise<{ hue: ProjectHue | null } | undefined> {
  if (nextCategory === current.category) return undefined;
  if (nextCategory !== "business") return { hue: null };
  if (isProjectHue(current.hue)) return undefined;
  return { hue: await hueForNewProject(executor, userId, nextCategory) };
}
