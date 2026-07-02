import type { ProjectCategory } from "@/lib/projects/categories";

export type AbyssBalanceItemInput = {
  id: string;
  title: string;
  type: "idea" | "task";
  category: ProjectCategory | null;
  promotedTaskId: string | null;
  resurfaceCount: number;
  lastTouchedAt: Date;
};

export type AbyssBalanceCandidate = {
  abyssItemId: string;
  taskId: string | null;
  title: string;
  category: ProjectCategory;
};

/** Prefer task-type items, then brighter (resurfaced) and recently touched backlog rows. */
export function compareAbyssBalanceItems(
  a: AbyssBalanceItemInput,
  b: AbyssBalanceItemInput
): number {
  if (a.type !== b.type) return a.type === "task" ? -1 : 1;
  if (a.resurfaceCount !== b.resurfaceCount) return b.resurfaceCount - a.resurfaceCount;
  return b.lastTouchedAt.getTime() - a.lastTouchedAt.getTime();
}

/**
 * Pick up to `limitPerCategory` Abyss backlog rows per requested category for the
 * balance pass resurface tray (PM6). Uses title-only when no linked task exists.
 */
export function pickAbyssBalanceCandidates(
  items: AbyssBalanceItemInput[],
  categories: ProjectCategory[],
  limitPerCategory = 1
): AbyssBalanceCandidate[] {
  if (categories.length === 0 || limitPerCategory <= 0) return [];

  const categorySet = new Set(categories);
  const byCategory = new Map<ProjectCategory, AbyssBalanceItemInput[]>();

  for (const item of items) {
    if (!item.category || !categorySet.has(item.category)) continue;
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }

  const picked: AbyssBalanceCandidate[] = [];
  for (const category of categories) {
    const bucket = byCategory.get(category);
    if (!bucket?.length) continue;

    const sorted = [...bucket].sort(compareAbyssBalanceItems);
    for (const item of sorted.slice(0, limitPerCategory)) {
      picked.push({
        abyssItemId: item.id,
        taskId: item.promotedTaskId,
        title: item.title,
        category,
      });
    }
  }

  return picked;
}
