import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { runAppTransaction, type AppDbTransaction } from "@/db/run-transaction";
import {
  syncPhaseRow,
  syncProjectMilestoneRow,
  syncProjectRow,
  syncTaskBulkImportItemRow,
  syncTaskBulkImportRow,
  syncTaskRow,
} from "@/db/record-sync-mutation";
import {
  phases,
  projectMilestones,
  projects,
  taskBulkImportItems,
  taskBulkImports,
  tasks,
} from "@/db/tables";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import { resolveProjectBacklogCreateFields } from "@/lib/tasks/project-backlog-create";

const categorySchema = z.enum(PROJECT_CATEGORIES);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD).");

const phaseUpsertSchema = z.object({
  key: z.string().min(1),
  id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  startDate: isoDateSchema.nullable().optional(),
  endDate: isoDateSchema.nullable().optional(),
});

const milestoneUpsertSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  targetDate: isoDateSchema.nullable().optional(),
});

const taskSeedSchema = z
  .object({
    phaseKey: z.string().min(1).optional(),
    phaseId: z.string().uuid().optional(),
    title: z.string().min(1).max(500),
    suggestedScheduledDate: isoDateSchema.nullable().optional(),
  })
  .refine((seed) => seed.phaseKey != null || seed.phaseId != null, {
    message: "Each task seed must reference a phaseKey or phaseId.",
  });

export const commitSetupInputSchema = z.object({
  projectId: z.string().uuid(),
  project: z
    .object({
      name: z.string().min(1).max(120).optional(),
      category: categorySchema.optional(),
    })
    .optional(),
  phases: z.array(phaseUpsertSchema),
  milestones: z.array(milestoneUpsertSchema),
  taskSeeds: z.array(taskSeedSchema),
});

export type CommitSetupInput = z.infer<typeof commitSetupInputSchema>;

type DbTransaction = AppDbTransaction;

function assertPhaseDates(
  startDate: string | null | undefined,
  endDate: string | null | undefined
) {
  if (startDate != null && endDate != null && endDate < startDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "endDate must be on or after startDate.",
    });
  }
}

async function getOwnedProject(userId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }

  return row;
}

async function nextPhaseSortOrder(
  tx: DbTransaction,
  userId: string,
  projectId: string
): Promise<number> {
  const siblings = await tx
    .select({ sortOrder: phases.sortOrder })
    .from(phases)
    .where(
      and(eq(phases.userId, userId), eq(phases.projectId, projectId), isNull(phases.parentPhaseId))
    );
  return siblings.reduce((max, s) => Math.max(max, s.sortOrder + 1), 0);
}

async function nextMilestoneSortOrder(
  tx: DbTransaction,
  userId: string,
  projectId: string
): Promise<number> {
  const siblings = await tx
    .select({ sortOrder: projectMilestones.sortOrder })
    .from(projectMilestones)
    .where(and(eq(projectMilestones.userId, userId), eq(projectMilestones.projectId, projectId)));
  return siblings.reduce((max, s) => Math.max(max, s.sortOrder + 1), 0);
}

async function upsertPhases(
  tx: DbTransaction,
  userId: string,
  projectId: string,
  phaseInputs: CommitSetupInput["phases"]
) {
  const keyToId = new Map<string, string>();
  const phaseById = new Map<string, { startDate: string | null; endDate: string | null }>();
  const created: (typeof phases.$inferSelect)[] = [];
  const updated: (typeof phases.$inferSelect)[] = [];

  let nextSort = await nextPhaseSortOrder(tx, userId, projectId);

  for (const input of phaseInputs) {
    const name = input.name.trim();
    if (!name) continue;

    const startDate = input.startDate ?? null;
    const endDate = input.endDate ?? null;
    assertPhaseDates(startDate, endDate);

    let phaseId = input.id ?? null;
    if (!phaseId) {
      const [row] = await tx
        .insert(phases)
        .values({
          userId,
          projectId,
          parentPhaseId: null,
          name,
          sortOrder: nextSort,
          startDate,
          endDate,
        })
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create phase." });
      }
      phaseId = row.id;
      created.push(row);
      nextSort += 1;
    } else {
      const [row] = await tx
        .update(phases)
        .set({
          name,
          startDate,
          endDate,
          updatedAt: new Date(),
        })
        .where(
          and(eq(phases.id, phaseId), eq(phases.userId, userId), eq(phases.projectId, projectId))
        )
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Phase not found." });
      }
      updated.push(row);
      phaseId = row.id;
    }

    keyToId.set(input.key, phaseId);
    phaseById.set(phaseId, { startDate, endDate });
  }

  return { keyToId, phaseById, created, updated };
}

async function upsertMilestones(
  tx: DbTransaction,
  userId: string,
  projectId: string,
  milestoneInputs: CommitSetupInput["milestones"]
) {
  const created: (typeof projectMilestones.$inferSelect)[] = [];
  const updated: (typeof projectMilestones.$inferSelect)[] = [];
  let nextSort = await nextMilestoneSortOrder(tx, userId, projectId);

  for (const input of milestoneInputs) {
    const title = input.title.trim();
    if (!title) continue;

    const targetDate = input.targetDate ?? null;

    if (!input.id) {
      const [row] = await tx
        .insert(projectMilestones)
        .values({
          userId,
          projectId,
          title,
          targetDate,
          sortOrder: nextSort,
        })
        .returning();
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create milestone.",
        });
      }
      created.push(row);
      nextSort += 1;
    } else {
      const [row] = await tx
        .update(projectMilestones)
        .set({
          title,
          targetDate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectMilestones.id, input.id),
            eq(projectMilestones.userId, userId),
            eq(projectMilestones.projectId, projectId)
          )
        )
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found." });
      }
      updated.push(row);
    }
  }

  return { createdMilestones: created, updatedMilestones: updated };
}

async function insertTaskSeeds(
  tx: DbTransaction,
  userId: string,
  projectId: string,
  category: (typeof PROJECT_CATEGORIES)[number],
  taskSeeds: CommitSetupInput["taskSeeds"],
  keyToId: Map<string, string>,
  phaseById: Map<string, { startDate: string | null; endDate: string | null }>
) {
  const normalized = taskSeeds
    .map((seed) => {
      const title = seed.title.trim();
      if (!title) return null;

      const phaseId =
        seed.phaseId ?? (seed.phaseKey != null ? keyToId.get(seed.phaseKey) : undefined);
      if (!phaseId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task seed references an unknown phase.",
        });
      }

      const phaseDates = phaseById.get(phaseId);
      const phaseStartDate = seed.suggestedScheduledDate ?? phaseDates?.startDate ?? null;
      const backlog = resolveProjectBacklogCreateFields({ phaseStartDate });

      return {
        phaseId,
        title,
        ...backlog,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (normalized.length === 0) {
    return { createdTasks: [] as (typeof tasks.$inferSelect)[], importRow: null };
  }

  const now = new Date();
  let importRow: typeof taskBulkImports.$inferSelect | null = null;

  if (normalized.length >= 2) {
    const [row] = await tx
      .insert(taskBulkImports)
      .values({
        userId,
        projectId,
        taskCount: normalized.length,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create import record.",
      });
    }
    importRow = row;
  }

  const createdTasks = await tx
    .insert(tasks)
    .values(
      normalized.map((task, index) => ({
        userId,
        projectId,
        phaseId: task.phaseId,
        title: task.title,
        scheduledDate: task.scheduledDate,
        bucketOverride: task.bucketOverride,
        suggestedScheduledDate: task.suggestedScheduledDate,
        priority: 0,
        sortOrder: index,
        category,
      }))
    )
    .returning();

  if (createdTasks.length !== normalized.length) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create tasks." });
  }

  if (importRow) {
    await tx.insert(taskBulkImportItems).values(
      createdTasks.map((row) => ({
        importId: importRow!.id,
        taskId: row.id,
        userId,
        updatedAt: now,
      }))
    );
  }

  return { createdTasks, importRow };
}

export async function commitProjectSetup(userId: string, input: CommitSetupInput) {
  const parsed = commitSetupInputSchema.parse(input);
  const project = await getOwnedProject(userId, parsed.projectId);

  const result = await runAppTransaction(async (tx) => {
    let updatedProject: typeof projects.$inferSelect | null = null;

    if (parsed.project) {
      const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (parsed.project.name !== undefined) patch.name = parsed.project.name.trim();
      if (parsed.project.category !== undefined) patch.category = parsed.project.category;

      if (Object.keys(patch).length > 1) {
        const [row] = await tx
          .update(projects)
          .set(patch)
          .where(and(eq(projects.id, parsed.projectId), eq(projects.userId, userId)))
          .returning();
        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update project.",
          });
        }
        updatedProject = row;
      }
    }

    const phaseResult = await upsertPhases(tx, userId, parsed.projectId, parsed.phases);
    const milestoneResult = await upsertMilestones(tx, userId, parsed.projectId, parsed.milestones);

    const category = updatedProject?.category ?? project.category;
    const taskResult = await insertTaskSeeds(
      tx,
      userId,
      parsed.projectId,
      category,
      parsed.taskSeeds,
      phaseResult.keyToId,
      phaseResult.phaseById
    );

    return {
      updatedProject,
      ...phaseResult,
      ...milestoneResult,
      ...taskResult,
    };
  });

  if (result.updatedProject) {
    await syncProjectRow(result.updatedProject.id, "update", result.updatedProject);
  }
  for (const row of result.created) {
    await syncPhaseRow(row.id, "insert", row);
  }
  for (const row of result.updated) {
    await syncPhaseRow(row.id, "update", row);
  }
  for (const row of result.createdMilestones) {
    await syncProjectMilestoneRow(row.id, "insert", row);
  }
  for (const row of result.updatedMilestones) {
    await syncProjectMilestoneRow(row.id, "update", row);
  }
  if (result.importRow) {
    await syncTaskBulkImportRow(result.importRow.id, "insert", result.importRow);
  }
  const now = new Date();
  for (const row of result.createdTasks) {
    await syncTaskRow(row.id, "insert", row);
    if (result.importRow) {
      await syncTaskBulkImportItemRow(`${result.importRow.id}:${row.id}`, "insert", {
        importId: result.importRow.id,
        taskId: row.id,
        userId,
        updatedAt: now,
      });
    }
  }

  return {
    projectId: parsed.projectId,
    phasesCreated: result.created.length,
    phasesUpdated: result.updated.length,
    milestonesCreated: result.createdMilestones.length,
    milestonesUpdated: result.updatedMilestones.length,
    tasksCreated: result.createdTasks.length,
    importId: result.importRow?.id ?? null,
  };
}
