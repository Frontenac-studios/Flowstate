import "server-only";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  syncPhaseRow,
  syncProjectRow,
  syncProtectedBlockRow,
  syncTaskRow,
  syncWeekDayPriorityRow,
} from "@/db/record-sync-mutation";
import { phases, projects, protectedBlocks, tasks, weekDayPriorities } from "@/db/tables";
import type { ConfirmUndoFrame } from "@/lib/chat/confirm-undo";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import { findProjectBySlug } from "@/lib/parser/fuzzy-project";
import { slugifyProjectName } from "@/lib/projects/slugify";
import { bucketToSchedulingFields } from "@/lib/tasks/bucket-scheduling";
import { applyScheduleBatch } from "@/server/tasks/apply-schedule-batch";
import { resolveTaskCategoryForUser } from "@/server/tasks/resolve-task-category";

export async function resolveOwnedTaskTitles(
  userId: string,
  taskIds: readonly string[]
): Promise<Map<string, string>> {
  if (taskIds.length === 0) return new Map();

  const rows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, [...taskIds])));

  return new Map(rows.map((row) => [row.id, row.title]));
}

export type ApplyProposedActionResult = {
  applied: number;
  titles: string[];
  undoFrames: ConfirmUndoFrame[];
};

async function getOwnedTaskRow(userId: string, taskId: string) {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function getOwnedPhaseRow(userId: string, phaseId: string) {
  const [row] = await db
    .select({
      id: phases.id,
      name: phases.name,
      description: phases.description,
      startDate: phases.startDate,
      endDate: phases.endDate,
      projectId: phases.projectId,
    })
    .from(phases)
    .where(and(eq(phases.id, phaseId), eq(phases.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function resolveProjectId(
  userId: string,
  projectSlug: string | null | undefined
): Promise<string | null> {
  if (!projectSlug?.trim()) return null;
  const projectRows = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(eq(projects.userId, userId));
  const match = findProjectBySlug(projectSlug.trim(), projectRows);
  return projectRows.find((p) => p.slug === match?.slug)?.id ?? null;
}

export async function applyProposedActionPayload(
  userId: string,
  action: ProposedAction
): Promise<ApplyProposedActionResult> {
  const undoFrames: ConfirmUndoFrame[] = [];

  switch (action.kind) {
    case "reschedule_tasks": {
      const previousRows = await db
        .select({
          id: tasks.id,
          scheduledDate: tasks.scheduledDate,
          bucketOverride: tasks.bucketOverride,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            inArray(
              tasks.id,
              action.items.map((item) => item.taskId)
            )
          )
        );

      const result = await applyScheduleBatch(
        userId,
        action.items.map((item) => ({
          taskId: item.taskId,
          scheduledDate: item.scheduledDate,
        }))
      );

      if (previousRows.length > 0) {
        undoFrames.push({
          type: "reschedule",
          assignments: previousRows.map((row) => ({
            taskId: row.id,
            previousScheduledDate: row.scheduledDate,
            previousBucketOverride: row.bucketOverride,
          })),
        });
      }

      return { applied: result.applied, titles: result.titles, undoFrames };
    }

    case "create_task": {
      const projectRows = await db
        .select({ id: projects.id, slug: projects.slug, name: projects.name })
        .from(projects)
        .where(eq(projects.userId, userId));

      const titles: string[] = [];
      const createdIds: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const title = item.title.trim();
        if (!title) continue;

        let projectId: string | null = null;
        if (item.projectSlug?.trim()) {
          const match = findProjectBySlug(item.projectSlug.trim(), projectRows);
          projectId = projectRows.find((p) => p.slug === match?.slug)?.id ?? null;
        }

        const resolved = await resolveTaskCategoryForUser({
          userId,
          title,
          explicit: null,
          projectId,
        });

        const [row] = await db
          .insert(tasks)
          .values({
            userId,
            title,
            // Chat-created tasks land in the inbox: unscheduled + "later" keeps
            // them out of Today (listToday excludes "later") while still showing
            // in the Week inbox rail (which keys only on scheduledDate === null).
            // Mirrors the apply_balance_suggestions recipe below.
            scheduledDate: null,
            bucketOverride: "later",
            suggestedScheduledDate: item.suggestedDate ?? item.scheduledDate ?? null,
            projectId,
            priority: item.priority ?? 0,
            category: resolved.category,
            categoryUnresolved: resolved.unresolved,
          })
          .returning();

        if (row) {
          await syncTaskRow(row.id, "insert", row);
          titles.push(row.title);
          createdIds.push(row.id);
          applied += 1;
        }
      }

      if (createdIds.length > 0) {
        undoFrames.push({ type: "create_tasks", taskIds: createdIds });
      }

      return { applied, titles, undoFrames };
    }

    case "complete_task": {
      const now = new Date();
      const titles: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const existing = await getOwnedTaskRow(userId, item.taskId);
        if (!existing || existing.completedAt) continue;

        const [row] = await db
          .update(tasks)
          .set({ completedAt: now, updatedAt: now })
          .where(
            and(eq(tasks.id, item.taskId), eq(tasks.userId, userId), isNull(tasks.completedAt))
          )
          .returning();

        if (row) {
          await syncTaskRow(row.id, "update", row);
          titles.push(row.title);
          applied += 1;
          undoFrames.push({
            type: "complete",
            taskId: row.id,
            previousCompletedAt: null,
          });
        }
      }

      return { applied, titles, undoFrames };
    }

    case "edit_task": {
      const titles: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const existing = await getOwnedTaskRow(userId, item.taskId);
        if (!existing) continue;

        const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
        if (item.nextTitle !== undefined) patch.title = item.nextTitle.trim();
        if (item.priority !== undefined) patch.priority = item.priority;
        if (item.scheduledDate !== undefined) {
          patch.scheduledDate = item.scheduledDate;
          patch.bucketOverride = null;
        }
        if (item.category !== undefined) {
          patch.category = item.category;
          patch.categoryUnresolved = false;
        }
        if (item.projectSlug !== undefined) {
          patch.projectId = await resolveProjectId(userId, item.projectSlug);
        }
        if (item.phaseId !== undefined) {
          patch.phaseId = item.phaseId;
          if (item.phaseId) {
            const phase = await getOwnedPhaseRow(userId, item.phaseId);
            if (phase) patch.projectId = phase.projectId;
          }
        }

        const [row] = await db
          .update(tasks)
          .set(patch)
          .where(and(eq(tasks.id, item.taskId), eq(tasks.userId, userId)))
          .returning();

        if (row) {
          await syncTaskRow(row.id, "update", row);
          titles.push(row.title);
          applied += 1;
          undoFrames.push({
            type: "edit_task",
            taskId: row.id,
            previous: {
              title: existing.title,
              priority: existing.priority,
              scheduledDate: existing.scheduledDate,
              bucketOverride: existing.bucketOverride,
              projectId: existing.projectId,
              phaseId: existing.phaseId,
              category: existing.category,
              categoryUnresolved: existing.categoryUnresolved,
            },
          });
        }
      }

      return { applied, titles, undoFrames };
    }

    case "delete_task": {
      const titles: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const existing = await getOwnedTaskRow(userId, item.taskId);
        if (!existing) continue;

        await db.delete(tasks).where(and(eq(tasks.id, item.taskId), eq(tasks.userId, userId)));
        await syncTaskRow(item.taskId, "delete", { id: item.taskId, userId });

        titles.push(existing.title);
        applied += 1;
        undoFrames.push({
          type: "delete",
          snapshot: {
            id: existing.id,
            title: existing.title,
            priority: existing.priority,
            scheduledDate: existing.scheduledDate,
            bucketOverride: existing.bucketOverride,
            projectId: existing.projectId,
            isTop3: existing.isTop3,
            top3Order: existing.top3Order,
            category: existing.category,
            categoryUnresolved: existing.categoryUnresolved,
            tags: existing.tags ?? [],
          },
        });
      }

      return { applied, titles, undoFrames };
    }

    case "set_top3": {
      const now = new Date();
      const todayFields = bucketToSchedulingFields("today");
      const titles: string[] = [];
      let applied = 0;
      const slotUndo: ConfirmUndoFrame & { type: "set_top3" } = { type: "set_top3", slots: [] };

      for (const item of action.items) {
        const existing = await getOwnedTaskRow(userId, item.taskId);
        if (!existing) continue;

        const [displaced] = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              eq(tasks.isTop3, true),
              eq(tasks.top3Order, item.slot),
              ne(tasks.id, item.taskId)
            )
          )
          .limit(1);

        if (displaced) {
          const [cleared] = await db
            .update(tasks)
            .set({
              isTop3: false,
              top3Order: null,
              top3PinnedAt: null,
              updatedAt: now,
            })
            .where(and(eq(tasks.id, displaced.id), eq(tasks.userId, userId)))
            .returning();
          if (cleared) {
            await syncTaskRow(cleared.id, "update", cleared);
            slotUndo.slots.push({
              taskId: cleared.id,
              previousIsTop3: true,
              previousTop3Order: displaced.top3Order,
              previousScheduledDate: displaced.scheduledDate,
              previousBucketOverride: displaced.bucketOverride,
            });
          }
        }

        const [row] = await db
          .update(tasks)
          .set({
            isTop3: true,
            top3Order: item.slot,
            top3PinnedAt: now,
            scheduledDate: todayFields.scheduledDate,
            bucketOverride: todayFields.bucketOverride,
            updatedAt: now,
          })
          .where(and(eq(tasks.id, item.taskId), eq(tasks.userId, userId)))
          .returning();

        if (row) {
          await syncTaskRow(row.id, "update", row);
          titles.push(row.title);
          applied += 1;
          slotUndo.slots.push({
            taskId: row.id,
            previousIsTop3: existing.isTop3,
            previousTop3Order: existing.top3Order,
            previousScheduledDate: existing.scheduledDate,
            previousBucketOverride: existing.bucketOverride,
          });
        }
      }

      if (slotUndo.slots.length > 0) undoFrames.push(slotUndo);
      return { applied, titles, undoFrames };
    }

    case "set_protected_block": {
      const titles: string[] = [];
      const blockIds: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const [row] = await db
          .insert(protectedBlocks)
          .values({
            userId,
            category: item.category,
            scheduledDate: item.scheduledDate,
            label: item.label ?? null,
            startMin: item.startMin ?? null,
            endMin: item.endMin ?? null,
            status: item.status ?? "confirmed",
            source: "chat",
          })
          .returning();

        if (row) {
          await syncProtectedBlockRow(row.id, "insert", row);
          const label = row.label ?? `${row.category} block`;
          titles.push(`${label} (${row.scheduledDate})`);
          blockIds.push(row.id);
          applied += 1;
        }
      }

      if (blockIds.length > 0) {
        undoFrames.push({ type: "create_protected_blocks", blockIds });
      }

      return { applied, titles, undoFrames };
    }

    case "set_day_priorities": {
      const now = new Date();
      const titles: string[] = [];
      let applied = 0;
      const rowsUndo: ConfirmUndoFrame & { type: "set_day_priorities" } = {
        type: "set_day_priorities",
        rows: [],
      };

      for (const item of action.items) {
        const task = await getOwnedTaskRow(userId, item.taskId);
        if (!task || task.scheduledDate !== item.scheduledDate) continue;

        const [existing] = await db
          .select()
          .from(weekDayPriorities)
          .where(
            and(
              eq(weekDayPriorities.userId, userId),
              eq(weekDayPriorities.taskId, item.taskId),
              eq(weekDayPriorities.scheduledDate, item.scheduledDate)
            )
          )
          .limit(1);

        await db
          .delete(weekDayPriorities)
          .where(
            and(
              eq(weekDayPriorities.userId, userId),
              eq(weekDayPriorities.scheduledDate, item.scheduledDate),
              eq(weekDayPriorities.priorityOrder, item.slot),
              ne(weekDayPriorities.taskId, item.taskId)
            )
          );

        let rowId: string;
        if (existing) {
          const [updated] = await db
            .update(weekDayPriorities)
            .set({ priorityOrder: item.slot, updatedAt: now })
            .where(eq(weekDayPriorities.id, existing.id))
            .returning();
          if (!updated) continue;
          rowId = updated.id;
          await syncWeekDayPriorityRow(rowId, "update", updated);
          rowsUndo.rows.push({
            id: rowId,
            taskId: item.taskId,
            scheduledDate: item.scheduledDate,
            previousPriorityOrder: existing.priorityOrder,
          });
        } else {
          const [inserted] = await db
            .insert(weekDayPriorities)
            .values({
              userId,
              taskId: item.taskId,
              scheduledDate: item.scheduledDate,
              priorityOrder: item.slot,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          if (!inserted) continue;
          rowId = inserted.id;
          await syncWeekDayPriorityRow(rowId, "insert", inserted);
          rowsUndo.rows.push({
            id: rowId,
            taskId: item.taskId,
            scheduledDate: item.scheduledDate,
            previousPriorityOrder: null,
          });
        }

        titles.push(`${task.title} → slot ${item.slot} (${item.scheduledDate})`);
        applied += 1;
      }

      if (rowsUndo.rows.length > 0) undoFrames.push(rowsUndo);
      return { applied, titles, undoFrames };
    }

    case "apply_balance_suggestions": {
      const now = new Date();
      const titles: string[] = [];
      const createdIds: string[] = [];
      const rescheduleUndo: {
        taskId: string;
        previousScheduledDate: string | null;
        previousBucketOverride: string | null;
      }[] = [];
      let applied = 0;

      for (const item of action.items) {
        if (item.taskId) {
          const existing = await getOwnedTaskRow(userId, item.taskId);
          if (!existing) continue;

          const patch: Partial<typeof tasks.$inferInsert> = {
            updatedAt: now,
            bucketOverride: null,
          };
          if (item.scheduledDate) patch.scheduledDate = item.scheduledDate;

          const [row] = await db
            .update(tasks)
            .set(patch)
            .where(and(eq(tasks.id, item.taskId), eq(tasks.userId, userId)))
            .returning();

          if (row) {
            await syncTaskRow(row.id, "update", row);
            titles.push(row.title);
            applied += 1;
            rescheduleUndo.push({
              taskId: row.id,
              previousScheduledDate: existing.scheduledDate,
              previousBucketOverride: existing.bucketOverride,
            });
          }
          continue;
        }

        const [row] = await db
          .insert(tasks)
          .values({
            userId,
            title: item.taskTitle.trim(),
            category: item.category,
            scheduledDate: item.scheduledDate ?? null,
            bucketOverride: item.scheduledDate ? null : "later",
          })
          .returning();

        if (row) {
          await syncTaskRow(row.id, "insert", row);
          titles.push(row.title);
          createdIds.push(row.id);
          applied += 1;
        }
      }

      if (createdIds.length > 0) undoFrames.push({ type: "create_tasks", taskIds: createdIds });
      if (rescheduleUndo.length > 0) {
        undoFrames.push({ type: "reschedule", assignments: rescheduleUndo });
      }

      return { applied, titles, undoFrames };
    }

    case "create_project": {
      const titles: string[] = [];
      const projectIds: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const slug = (item.slug ?? slugifyProjectName(item.name)).toLowerCase();
        const [row] = await db
          .insert(projects)
          .values({
            userId,
            name: item.name.trim(),
            slug,
            category: item.category,
          })
          .returning();

        if (row) {
          await syncProjectRow(row.id, "insert", row);
          titles.push(row.name);
          projectIds.push(row.id);
          applied += 1;
        }
      }

      if (projectIds.length > 0) {
        undoFrames.push({ type: "create_projects", projectIds });
      }

      return { applied, titles, undoFrames };
    }

    case "edit_phase": {
      const titles: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const existing = await getOwnedPhaseRow(userId, item.phaseId);
        if (!existing) continue;

        const patch: Partial<typeof phases.$inferInsert> = { updatedAt: new Date() };
        if (item.name !== undefined) patch.name = item.name.trim();
        if (item.description !== undefined) patch.description = item.description;
        if (item.startDate !== undefined) patch.startDate = item.startDate;
        if (item.endDate !== undefined) patch.endDate = item.endDate;

        const [row] = await db
          .update(phases)
          .set(patch)
          .where(and(eq(phases.id, item.phaseId), eq(phases.userId, userId)))
          .returning();

        if (row) {
          await syncPhaseRow(row.id, "update", row);
          titles.push(row.name);
          applied += 1;
          undoFrames.push({
            type: "edit_phase",
            phaseId: row.id,
            previous: {
              name: existing.name,
              description: existing.description,
              startDate: existing.startDate,
              endDate: existing.endDate,
            },
          });
        }
      }

      return { applied, titles, undoFrames };
    }

    case "move_task_to_phase": {
      const titles: string[] = [];
      let applied = 0;

      for (const item of action.items) {
        const existing = await getOwnedTaskRow(userId, item.taskId);
        if (!existing) continue;

        const patch: Partial<typeof tasks.$inferInsert> = {
          phaseId: item.phaseId,
          updatedAt: new Date(),
        };

        if (item.phaseId) {
          const phase = await getOwnedPhaseRow(userId, item.phaseId);
          if (!phase) continue;
          patch.projectId = phase.projectId;
        }

        const [row] = await db
          .update(tasks)
          .set(patch)
          .where(and(eq(tasks.id, item.taskId), eq(tasks.userId, userId)))
          .returning();

        if (row) {
          await syncTaskRow(row.id, "update", row);
          titles.push(row.title);
          applied += 1;
          undoFrames.push({
            type: "move_task_to_phase",
            taskId: row.id,
            previousPhaseId: existing.phaseId,
            previousProjectId: existing.projectId,
          });
        }
      }

      return { applied, titles, undoFrames };
    }

    case "replan_project_dates": {
      const titles: string[] = [];
      let applied = 0;
      const phasesUndo: ConfirmUndoFrame & { type: "replan_project_dates" } = {
        type: "replan_project_dates",
        phases: [],
      };

      for (const item of action.items) {
        const existing = await getOwnedPhaseRow(userId, item.phaseId);
        if (!existing) continue;

        const patch: Partial<typeof phases.$inferInsert> = { updatedAt: new Date() };
        if (item.startDate !== undefined) patch.startDate = item.startDate;
        if (item.endDate !== undefined) patch.endDate = item.endDate;
        if (patch.startDate === undefined && patch.endDate === undefined) continue;

        const [row] = await db
          .update(phases)
          .set(patch)
          .where(and(eq(phases.id, item.phaseId), eq(phases.userId, userId)))
          .returning();

        if (row) {
          await syncPhaseRow(row.id, "update", row);
          titles.push(`${item.phaseName}: ${row.startDate ?? "?"} → ${row.endDate ?? "?"}`);
          applied += 1;
          phasesUndo.phases.push({
            phaseId: row.id,
            previousStartDate: existing.startDate,
            previousEndDate: existing.endDate,
          });
        }
      }

      if (phasesUndo.phases.length > 0) undoFrames.push(phasesUndo);
      return { applied, titles, undoFrames };
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return { applied: 0, titles: [], undoFrames: [] };
    }
  }
}
