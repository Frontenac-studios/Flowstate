import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import type { WeekCategoryLoadSnapshot } from "@/lib/week/week-category-load";

export type PlanTaskLine = {
  id: string;
  title: string;
  isTop3: boolean;
  priority: number;
  projectSlug: string | null;
  scheduledDate: string | null;
  category: ProjectCategory;
  categoryUnresolved: boolean;
  suggestedScheduledDate: string | null;
};

/**
 * Render a labelled block of task lines for the planner context. Extends the
 * plain title/tags rendering with category, inbox, and chat-suggested-date
 * markers so the model can reason about placement.
 */
export function formatPlanTaskLines(label: string, tasks: readonly PlanTaskLine[]): string {
  if (tasks.length === 0) return `${label}: (none)`;
  const lines = tasks.map((t) => {
    const tags = [
      t.categoryUnresolved ? "category unresolved" : t.category,
      t.isTop3 ? "top3" : null,
      t.scheduledDate === null ? "inbox" : null,
      t.suggestedScheduledDate ? `suggested ${t.suggestedScheduledDate}` : null,
      t.projectSlug ? `#${t.projectSlug}` : null,
      t.priority > 0 ? `p${t.priority}` : null,
      t.scheduledDate ? `due ${t.scheduledDate}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return `- id=${t.id} | ${t.title}${tags ? ` (${tags})` : ""}`;
  });
  return `${label}:\n${lines.join("\n")}`;
}

export type LooseTaskCountRow = {
  category: ProjectCategory;
  categoryUnresolved?: boolean;
};

/**
 * Summarise project-less tasks by category, e.g.
 * `Loose tasks (no project): adulting 12, relationships 3`. Zero counts are
 * omitted; an empty input yields an empty string.
 */
export function formatLooseTaskCounts(rows: readonly LooseTaskCountRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.categoryUnresolved ? "uncategorized" : row.category;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const parts: string[] = [];
  for (const category of PROJECT_CATEGORIES) {
    const count = counts.get(category) ?? 0;
    if (count > 0) parts.push(`${category} ${count}`);
  }
  const uncategorized = counts.get("uncategorized") ?? 0;
  if (uncategorized > 0) parts.push(`uncategorized ${uncategorized}`);

  if (parts.length === 0) return "";
  return `Loose tasks (no project): ${parts.join(", ")}`;
}

/** One-line weekly category balance summary from a computed load snapshot. */
export function formatWeekCategoryLoadSummary(snapshot: WeekCategoryLoadSnapshot): string {
  if (snapshot.totalWeight === 0) {
    return "Week category load: nothing planned yet";
  }

  const parts = PROJECT_CATEGORIES.filter(
    (category) => snapshot.byCategory[category].weight > 0
  ).map((category) => `${categoryLabel(category)} ${snapshot.byCategory[category].weight}`);

  let line = `Week category load: ${parts.join(", ")}`;
  if (snapshot.emptyCategories.length > 0) {
    line += `; no attention: ${snapshot.emptyCategories.map(categoryLabel).join(", ")}`;
  }
  return line;
}

export type ProjectStructurePhase = {
  id: string;
  name: string;
  parentPhaseId: string | null;
  sortOrder: number;
};

function bySortThenName(a: ProjectStructurePhase, b: ProjectStructurePhase): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

/**
 * Render a project's phase tree with open-task counts, marking the selected
 * phase. Mirrors the root→subphase sort/flatten style of
 * `flattenPhasesForSelect`.
 */
export function formatProjectStructureBlock(input: {
  projectName: string;
  phases: readonly ProjectStructurePhase[];
  taskCountByPhaseId: Record<string, number>;
  selectedPhaseId?: string | null;
}): string {
  const { projectName, phases, taskCountByPhaseId, selectedPhaseId } = input;
  const header = `Project structure — ${projectName}:`;
  if (phases.length === 0) return `${header}\n- (no phases)`;

  const childrenByParent = new Map<string, ProjectStructurePhase[]>();
  const roots: ProjectStructurePhase[] = [];
  for (const phase of phases) {
    if (phase.parentPhaseId === null) {
      roots.push(phase);
    } else {
      const list = childrenByParent.get(phase.parentPhaseId) ?? [];
      list.push(phase);
      childrenByParent.set(phase.parentPhaseId, list);
    }
  }

  roots.sort(bySortThenName);
  for (const list of Array.from(childrenByParent.values())) {
    list.sort(bySortThenName);
  }

  const lines: string[] = [];
  const walk = (phase: ProjectStructurePhase, depth: number) => {
    const indent = "  ".repeat(depth);
    const count = taskCountByPhaseId[phase.id] ?? 0;
    const selected = selectedPhaseId === phase.id ? " [selected]" : "";
    // Include id so create_phase can pass parentPhaseId without guessing.
    lines.push(`${indent}- id=${phase.id} | ${phase.name} (${count} open)${selected}`);
    for (const child of childrenByParent.get(phase.id) ?? []) {
      walk(child, depth + 1);
    }
  };
  for (const root of roots) walk(root, 0);

  return `${header}\n${lines.join("\n")}`;
}
