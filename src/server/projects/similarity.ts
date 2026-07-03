import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";

import { db } from "@/db";
import { syncProjectRow, syncProjectSimilarityRow } from "@/db/record-sync-mutation";
import { projectSimilarity, projects, tasks, taskTimeEntries } from "@/db/tables";
import type { ProjectCategory } from "@/lib/projects/categories";
import { aggregateSecondsByTask } from "@/lib/projects/aggregate-time-rollups";
import { applyLearnedDurations } from "@/lib/projects/learn-durations";
import {
  rankSimilarProjects,
  selectInferredSimilar,
  type ProjectSimilaritySource,
  type RankedSimilarProject,
} from "@/lib/projects/project-similarity";
import type { ProjectTemplateStructure } from "@/lib/projects/template-structure";

type DbClient = typeof db;

async function listCandidateProjects(
  userId: string,
  excludeProjectId?: string
): Promise<
  Array<{
    id: string;
    name: string;
    category: ProjectCategory;
    embedding: number[] | null;
  }>
> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      category: projects.category,
      embedding: projects.embedding,
    })
    .from(projects)
    .where(
      excludeProjectId
        ? and(eq(projects.userId, userId), ne(projects.id, excludeProjectId))
        : eq(projects.userId, userId)
    );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    embedding: row.embedding ?? null,
  }));
}

export async function listSimilarCandidatesForUser(
  userId: string,
  options?: {
    excludeProjectId?: string;
    embedding?: number[];
    preferredCategory?: ProjectCategory | null;
  }
): Promise<RankedSimilarProject[]> {
  const candidates = await listCandidateProjects(userId, options?.excludeProjectId);
  return rankSimilarProjects(options?.embedding ?? [], candidates, {
    preferredCategory: options?.preferredCategory ?? null,
    excludeIds: options?.excludeProjectId ? new Set([options.excludeProjectId]) : undefined,
  });
}

export async function upsertProjectSimilarity(params: {
  userId: string;
  projectId: string;
  similarProjectId: string;
  source: ProjectSimilaritySource;
  score?: number | null;
}): Promise<typeof projectSimilarity.$inferSelect> {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(projectSimilarity)
    .where(
      and(
        eq(projectSimilarity.userId, params.userId),
        eq(projectSimilarity.projectId, params.projectId),
        eq(projectSimilarity.similarProjectId, params.similarProjectId)
      )
    )
    .limit(1);

  if (existing) {
    // User tags win over inferred; never demote a user tag.
    if (existing.source === "user" && params.source === "inferred") {
      return existing;
    }

    const [updated] = await db
      .update(projectSimilarity)
      .set({
        source: params.source,
        score: params.score ?? existing.score,
        updatedAt: now,
      })
      .where(eq(projectSimilarity.id, existing.id))
      .returning();

    if (!updated) return existing;
    await syncProjectSimilarityRow(updated.id, "update", updated);
    return updated;
  }

  const [row] = await db
    .insert(projectSimilarity)
    .values({
      userId: params.userId,
      projectId: params.projectId,
      similarProjectId: params.similarProjectId,
      source: params.source,
      score: params.score ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to store project similarity.");
  }

  await syncProjectSimilarityRow(row.id, "insert", row);
  return row;
}

export async function listProjectSimilarityLinks(userId: string, projectId: string) {
  const rows = await db
    .select({
      id: projectSimilarity.id,
      projectId: projectSimilarity.projectId,
      similarProjectId: projectSimilarity.similarProjectId,
      source: projectSimilarity.source,
      score: projectSimilarity.score,
      similarName: projects.name,
      similarCategory: projects.category,
    })
    .from(projectSimilarity)
    .innerJoin(projects, eq(projects.id, projectSimilarity.similarProjectId))
    .where(and(eq(projectSimilarity.userId, userId), eq(projectSimilarity.projectId, projectId)));

  return rows;
}

export async function clearUserSimilarityLink(
  userId: string,
  projectId: string,
  similarProjectId: string
): Promise<void> {
  const [row] = await db
    .select({ id: projectSimilarity.id })
    .from(projectSimilarity)
    .where(
      and(
        eq(projectSimilarity.userId, userId),
        eq(projectSimilarity.projectId, projectId),
        eq(projectSimilarity.similarProjectId, similarProjectId),
        eq(projectSimilarity.source, "user")
      )
    )
    .limit(1);

  if (!row) return;

  await db.delete(projectSimilarity).where(eq(projectSimilarity.id, row.id));
  await syncProjectSimilarityRow(row.id, "delete", {
    id: row.id,
    userId,
  });
}

/** Store MiniLM embedding on a project (client-computed). */
export async function backfillProjectEmbedding(
  userId: string,
  projectId: string,
  embedding: number[]
): Promise<typeof projects.$inferSelect | null> {
  const now = new Date();
  const [updated] = await db
    .update(projects)
    .set({ embedding, updatedAt: now })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning();

  if (!updated) return null;
  await syncProjectRow(updated.id, "update", updated);
  return updated;
}

/** Infer and store similarity links from a project's embedding. */
export async function inferAndStoreSimilarProjects(
  userId: string,
  projectId: string,
  embedding: number[],
  preferredCategory?: ProjectCategory | null
): Promise<RankedSimilarProject[]> {
  const candidates = await listCandidateProjects(userId, projectId);
  const inferred = selectInferredSimilar(embedding, candidates, {
    preferredCategory: preferredCategory ?? null,
    excludeIds: new Set([projectId]),
  });

  for (const hit of inferred) {
    await upsertProjectSimilarity({
      userId,
      projectId,
      similarProjectId: hit.id,
      source: "inferred",
      score: hit.score,
    });
  }

  return inferred;
}

export async function loadDurationSamplesForProjects(
  userId: string,
  projectIds: string[]
): Promise<Array<{ title: string; minutes: number }>> {
  if (projectIds.length === 0) return [];

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      timeEstimateMinutes: tasks.timeEstimateMinutes,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(tasks.projectId, projectIds),
        isNotNull(tasks.completedAt)
      )
    );

  if (taskRows.length === 0) return [];

  const taskIds = taskRows.map((row) => row.id);
  const entryRows = await db
    .select({
      taskId: taskTimeEntries.taskId,
      startedAt: taskTimeEntries.startedAt,
      endedAt: taskTimeEntries.endedAt,
    })
    .from(taskTimeEntries)
    .where(
      and(
        eq(taskTimeEntries.userId, userId),
        inArray(taskTimeEntries.taskId, taskIds),
        isNotNull(taskTimeEntries.endedAt)
      )
    );

  const secondsByTask = aggregateSecondsByTask(entryRows);

  const samples: Array<{ title: string; minutes: number }> = [];
  for (const task of taskRows) {
    const actualSeconds = secondsByTask.get(task.id);
    const minutes =
      actualSeconds != null && actualSeconds > 0
        ? Math.round(actualSeconds / 60)
        : task.timeEstimateMinutes;
    if (minutes == null || minutes <= 0) continue;
    samples.push({ title: task.title, minutes });
  }

  return samples;
}

export async function enrichStructureWithSimilarDurations(
  userId: string,
  structure: ProjectTemplateStructure,
  similarProjectIds: string[]
): Promise<ProjectTemplateStructure> {
  const samples = await loadDurationSamplesForProjects(userId, similarProjectIds);
  return applyLearnedDurations(structure, samples);
}

/** Resolve similar project ids for a project (stored links). */
export async function listSimilarProjectIds(userId: string, projectId: string): Promise<string[]> {
  const rows = await db
    .select({ similarProjectId: projectSimilarity.similarProjectId })
    .from(projectSimilarity)
    .where(and(eq(projectSimilarity.userId, userId), eq(projectSimilarity.projectId, projectId)));

  return rows.map((row) => row.similarProjectId);
}

export type { DbClient };
