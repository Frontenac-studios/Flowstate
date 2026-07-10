import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { projects } from "@/db/tables";

export async function countActiveProjects(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)));

  return row?.count ?? 0;
}
