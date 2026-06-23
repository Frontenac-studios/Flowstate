import { priorityMeta } from "@/lib/tasks/priority";

/**
 * The Projects "priority lens" (VF-4c, VF5): a Miller-only on-demand filter that
 * narrows visible tasks to the selected priority levels. Pure — phases are never
 * filtered (they stay as the column structure); an empty selection shows all.
 */
export function filterTasksByPriority<T extends { priority: number }>(
  tasks: T[],
  levels: ReadonlySet<number>
): T[] {
  if (levels.size === 0) return tasks;
  return tasks.filter((task) => levels.has(priorityMeta(task.priority).level));
}

const STORAGE_KEY = "kash-miller-priority";

export function readPriorityFilter(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(
      raw
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 3)
    );
  } catch {
    return new Set();
  }
}

export function writePriorityFilter(levels: ReadonlySet<number>): void {
  if (typeof window === "undefined") return;
  try {
    if (levels.size === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, Array.from(levels).sort().join(","));
  } catch {
    /* ignore quota / private mode */
  }
}
