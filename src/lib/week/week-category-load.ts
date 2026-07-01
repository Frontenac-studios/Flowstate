import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

import { PROTECTED_BLOCK_WEIGHT, taskLoadWeight, type LoadWeightedTask } from "./task-load-weight";

export type WeekCategoryLoadRow = {
  category: ProjectCategory;
  weight: number;
  taskCount: number;
  protectedBlockCount: number;
};

export type WeekCategoryLoadSnapshot = {
  byCategory: Record<ProjectCategory, WeekCategoryLoadRow>;
  /** Core life-areas with no planned weight this week. */
  emptyCategories: ProjectCategory[];
  totalWeight: number;
};

type WeekCategoryLoadTask = LoadWeightedTask & {
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
};

type WeekCategoryLoadBlock = {
  category: ProjectCategory;
};

/** Per-category load for the week — tasks (Top-3-weighted) plus protected blocks. */
export function computeWeekCategoryLoad(input: {
  tasks: readonly WeekCategoryLoadTask[];
  protectedBlocks: readonly WeekCategoryLoadBlock[];
}): WeekCategoryLoadSnapshot {
  const byCategory = Object.fromEntries(
    PROJECT_CATEGORIES.map((category) => [
      category,
      { category, weight: 0, taskCount: 0, protectedBlockCount: 0 },
    ])
  ) as Record<ProjectCategory, WeekCategoryLoadRow>;

  for (const task of input.tasks) {
    const resolved = task.category && !task.categoryUnresolved ? task.category : null;
    if (!resolved) continue;
    const row = byCategory[resolved];
    row.weight += taskLoadWeight(task);
    row.taskCount += 1;
  }

  for (const block of input.protectedBlocks) {
    const row = byCategory[block.category];
    row.weight += PROTECTED_BLOCK_WEIGHT;
    row.protectedBlockCount += 1;
  }

  const totalWeight = PROJECT_CATEGORIES.reduce(
    (sum, category) => sum + byCategory[category].weight,
    0
  );
  const emptyCategories =
    totalWeight > 0
      ? PROJECT_CATEGORIES.filter((category) => byCategory[category].weight === 0)
      : [];

  return { byCategory, emptyCategories, totalWeight };
}
