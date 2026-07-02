import { and, count, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { tasks } from "@/db/tables";

/** Completed project tasks with estimates — samples for duration-confidence UI (§9). */
export async function countEstimateSamplesForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNotNull(tasks.projectId),
        isNotNull(tasks.completedAt),
        isNotNull(tasks.timeEstimateMinutes)
      )
    );

  return row?.total ?? 0;
}
