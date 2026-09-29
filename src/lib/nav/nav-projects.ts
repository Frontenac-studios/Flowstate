import type { ProjectCategory } from "@/lib/projects/categories";

type ProjectListRow = {
  id: string;
  name: string;
  category: ProjectCategory;
  hue: number | null;
  state: "prospect" | "active" | "paused" | "done";
  taskCount: number;
  completedCount: number;
};

export type NavProject = {
  id: string;
  name: string;
  category: ProjectCategory;
  hue: number | null;
  openCount: number;
};

/**
 * Spec v2/v5 nav: the Projects group lists live projects (not done; archived ones
 * never reach the list) with an open-task count. Business projects come first in
 * hue order — the order their colours were handed out — then personal, then name.
 */
export function navProjects(rows: readonly ProjectListRow[]): NavProject[] {
  return rows
    .filter((row) => row.state !== "done")
    .map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      hue: row.hue,
      openCount: Math.max(0, row.taskCount - row.completedCount),
    }))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category === "business" ? -1 : 1;
      const byHue = (a.hue ?? 99) - (b.hue ?? 99);
      return byHue !== 0 ? byHue : a.name.localeCompare(b.name);
    });
}
