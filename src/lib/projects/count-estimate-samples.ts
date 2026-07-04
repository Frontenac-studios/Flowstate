import { and, count, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { tasks } from "@/db/tables";

/** Completed project tasks with estimates — samples for duration-confidence UI (§9). */
export async function countEstimateSamplesForUser(
  userId: string,
  similarProjectIds?: string[]
): Promise<number> {
  const projectFilter =
    similarProjectIds && similarProjectIds.length > 0
      ? inArray(tasks.projectId, similarProjectIds)
      : isNotNull(tasks.projectId);

  const [row] = await db
    .select({ total: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        projectFilter,
        isNotNull(tasks.completedAt),
        isNotNull(tasks.timeEstimateMinutes)
      )
    );

  return row?.total ?? 0;
}
