import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { syncTaskRow } from "@/db/record-sync-mutation";
import { tasks } from "@/db/tables";
import {
  validateScheduleAssignments,
  type ScheduleAssignment,
} from "@/lib/tasks/validate-schedule-assignments";

export async function applyScheduleBatch(
  userId: string,
  assignments: ScheduleAssignment[]
): Promise<{ applied: number; titles: string[] }> {
  if (assignments.length === 0) {
    return { applied: 0, titles: [] };
  }

  const uniqueIds = Array.from(new Set(assignments.map((a) => a.taskId)));
  const ownedRows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, uniqueIds)));

  const ownedSet = new Set(ownedRows.map((r) => r.id));
  const titleById = new Map(ownedRows.map((r) => [r.id, r.title]));

  const validation = validateScheduleAssignments(assignments, ownedSet);
  if (!validation.ok) {
    const message =
      validation.error === "UNKNOWN_TASK"
        ? "One or more tasks were not found."
        : validation.error === "DUPLICATE_TASK"
          ? "Duplicate task in batch."
          : validation.error === "INVALID_DATE"
            ? "One or more dates are invalid."
            : "One or more dates are outside the allowed range.";
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }

  const now = new Date();
  const titles: string[] = [];

  for (const row of validation.normalized) {
    const [updated] = await db
      .update(tasks)
      .set({
        scheduledDate: row.scheduledDate,
        bucketOverride: null,
        updatedAt: now,
      })
      .where(and(eq(tasks.id, row.taskId), eq(tasks.userId, userId)))
      .returning();

    if (updated) {
      await syncTaskRow(updated.id, "update", updated);
      titles.push(titleById.get(row.taskId) ?? updated.title);
    }
  }

  return { applied: validation.normalized.length, titles };
}
