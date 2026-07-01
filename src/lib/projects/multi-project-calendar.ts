import { flattenTree, type GanttSpan } from "./gantt-scale";
import { buildPhaseTree, resolveEffectivePhaseRange } from "./phase-tree";
import type { ProjectCategory } from "./categories";

export type MultiProjectCalendarPhase = {
  id: string;
  projectId: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  completedAt: Date | null;
};

export type MultiProjectCalendarTask = {
  projectId: string;
  phaseId: string | null;
  sortOrder: number;
  scheduledDate: string | null;
  completedAt: Date | null;
};

export type MultiProjectCalendarProject = {
  id: string;
  name: string;
  category: ProjectCategory;
};

export type MultiProjectCalendarRow = {
  projectId: string;
  projectName: string;
  category: ProjectCategory;
  phaseId: string;
  phaseName: string;
  depth: number;
  isLeaf: boolean;
  start: string;
  end: string;
  completed: boolean;
};

function mergeSpan(current: GanttSpan | null, start: string, end: string): GanttSpan {
  if (!current) return { start, end };
  return {
    start: start < current.start ? start : current.start,
    end: end > current.end ? end : current.end,
  };
}

export function buildMultiProjectCalendarRows(
  projects: readonly MultiProjectCalendarProject[],
  phases: readonly MultiProjectCalendarPhase[],
  tasks: readonly MultiProjectCalendarTask[]
): { span: GanttSpan | null; rows: MultiProjectCalendarRow[] } {
  const phasesByProject = new Map<string, MultiProjectCalendarPhase[]>();
  for (const phase of phases) {
    const list = phasesByProject.get(phase.projectId) ?? [];
    list.push(phase);
    phasesByProject.set(phase.projectId, list);
  }
  const tasksByProject = new Map<string, MultiProjectCalendarTask[]>();
  for (const task of tasks) {
    const list = tasksByProject.get(task.projectId) ?? [];
    list.push(task);
    tasksByProject.set(task.projectId, list);
  }
  const rows: MultiProjectCalendarRow[] = [];
  let span: GanttSpan | null = null;
  for (const project of [...projects].sort((a, b) => a.name.localeCompare(b.name))) {
    const tree = buildPhaseTree(
      phasesByProject.get(project.id) ?? [],
      tasksByProject.get(project.id) ?? []
    );
    for (const flat of flattenTree(tree)) {
      const range = resolveEffectivePhaseRange(flat.node);
      if (range.start === null || range.end === null) continue;
      span = mergeSpan(span, range.start, range.end);
      rows.push({
        projectId: project.id,
        projectName: project.name,
        category: project.category,
        phaseId: flat.node.phase.id,
        phaseName: flat.node.phase.name,
        depth: flat.depth,
        isLeaf: flat.isLeaf,
        start: range.start,
        end: range.end,
        completed: flat.node.phase.completedAt !== null,
      });
    }
  }
  return { span, rows };
}

export function projectIndexById(
  projects: readonly MultiProjectCalendarProject[]
): Map<string, number> {
  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  return new Map(sorted.map((project, index) => [project.id, index]));
}
