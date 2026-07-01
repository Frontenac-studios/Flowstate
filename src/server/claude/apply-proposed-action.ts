import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { syncTaskRow } from "@/db/record-sync-mutation";
import { projects, tasks } from "@/db/tables";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { findProjectBySlug } from "@/lib/parser/fuzzy-project";
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
};

export async function applyProposedActionPayload(
  userId: string,
  action: ProposedAction
): Promise<ApplyProposedActionResult> {
  switch (action.kind) {
    case "reschedule_tasks": {
      const result = await applyScheduleBatch(
        userId,
        action.items.map((item) => ({
          taskId: item.taskId,
          scheduledDate: item.scheduledDate,
        }))
      );
      return { applied: result.applied, titles: result.titles };
    }

    case "create_task": {
      const todayIso = toISODateString(startOfLocalDay());
      const projectRows = await db
        .select({ id: projects.id, slug: projects.slug, name: projects.name })
        .from(projects)
        .where(eq(projects.userId, userId));

      const titles: string[] = [];
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
            scheduledDate: item.scheduledDate ?? todayIso,
            bucketOverride: null,
            projectId,
            priority: item.priority ?? 0,
            category: resolved.category,
            categoryUnresolved: resolved.unresolved,
          })
          .returning();

        if (row) {
          await syncTaskRow(row.id, "insert", row);
          titles.push(row.title);
          applied += 1;
        }
      }

      return { applied, titles };
    }

    case "complete_task": {
      const now = new Date();
      const titles: string[] = [];
      let applied = 0;

      for (const item of action.items) {
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
        }
      }

      return { applied, titles };
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return { applied: 0, titles: [] };
    }
  }
}
