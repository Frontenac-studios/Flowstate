import "server-only";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { abyssItems } from "@/db/tables";
import {
  pickAbyssBalanceCandidates,
  type AbyssBalanceCandidate,
} from "@/lib/planning/abyss-balance-candidates";
import type { ProjectCategory } from "@/lib/projects/categories";

export type { AbyssBalanceCandidate };

/**
 * Resurface backlog/Abyss tasks aligned with balance-pass categories (PM6-1).
 * Active items matching the requested categories; task-type rows preferred.
 */
export async function fetchAbyssBalanceCandidates(
  userId: string,
  categories: ProjectCategory[]
): Promise<AbyssBalanceCandidate[]> {
  if (categories.length === 0) return [];

  const rows = await db
    .select({
      id: abyssItems.id,
      title: abyssItems.title,
      type: abyssItems.type,
      category: abyssItems.category,
      promotedTaskId: abyssItems.promotedTaskId,
      resurfaceCount: abyssItems.resurfaceCount,
      lastTouchedAt: abyssItems.lastTouchedAt,
    })
    .from(abyssItems)
    .where(
      and(
        eq(abyssItems.userId, userId),
        eq(abyssItems.status, "active"),
        isNotNull(abyssItems.category),
        inArray(abyssItems.category, categories)
      )
    );

  return pickAbyssBalanceCandidates(rows, categories);
}
