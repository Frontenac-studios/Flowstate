import "server-only";

import type { ProjectCategory } from "@/lib/projects/categories";

export type AbyssBalanceCandidate = {
  taskId: string;
  title: string;
  category: ProjectCategory;
};

/**
 * Resurface backlog/Abyss tasks aligned with balance-pass categories (PM6-1).
 * Stub until §10 Abyss integration — returns no candidates.
 */
export async function fetchAbyssBalanceCandidates(
  userId: string,
  categories: ProjectCategory[]
): Promise<AbyssBalanceCandidate[]> {
  void userId;
  void categories;
  return [];
}
