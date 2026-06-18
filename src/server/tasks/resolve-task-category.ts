import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, projects } from "@/db/tables";
import { type ProjectCategory } from "@/lib/projects/categories";
import { resolveTaskCategory, type ResolvedCategory } from "@/lib/tasks/resolveTaskCategory";

import { inferCategory } from "./infer-category";

interface ResolveArgs {
  userId: string;
  title: string;
  /** Explicit category from the composer / chip / API (resolver layer 1). */
  explicit?: ProjectCategory | null;
  /** When set, project.category supplies the inheritance default (layer 2). */
  projectId?: string | null;
}

// Server-side wrapper around the shared resolver: gathers the project-inheritance and
// last-used inputs from the DB, then runs the same pure ladder used offline (1.3).
// `online: true` because the server has network — the inference seam decides whether
// it actually has an opinion.
export async function resolveTaskCategoryForUser({
  userId,
  title,
  explicit,
  projectId,
}: ResolveArgs): Promise<ResolvedCategory> {
  let projectCategory: ProjectCategory | null = null;
  if (projectId) {
    const [project] = await db
      .select({ category: projects.category })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);
    projectCategory = project?.category ?? null;
  }

  const [settings] = await db
    .select({ lastUsedCategory: appSettings.lastUsedCategory })
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);

  // The pure resolver is synchronous; the embedding call is async. Run inference here
  // (only when no explicit/project value would win anyway) and inject the precomputed
  // result as the layer-3 seam, keeping resolveTaskCategory pure + sync + easily tested.
  const needsInference = !explicit && !projectCategory;
  const inference = needsInference ? await inferCategory(title) : null;

  return resolveTaskCategory(
    title,
    {
      explicit: explicit ?? null,
      projectCategory,
      lastUsed: settings?.lastUsedCategory ?? null,
      online: true,
    },
    () => inference
  );
}

// 1.4 habit layer: remember the category a create actually landed on, so the next
// loose task defaults to it. Deliberately NOT called for the unresolved fallback —
// that is invisible plumbing (1.4d), not a real choice, and must not poison the habit.
export async function setLastUsedCategory(
  userId: string,
  category: ProjectCategory
): Promise<void> {
  await db
    .insert(appSettings)
    .values({ userId, lastUsedCategory: category })
    .onConflictDoUpdate({
      target: appSettings.userId,
      set: { lastUsedCategory: category, updatedAt: new Date() },
    });
}
