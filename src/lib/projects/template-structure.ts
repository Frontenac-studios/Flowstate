import { z } from "zod";

export const templateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  timeEstimateMinutes: z.number().int().positive().nullable().optional(),
});

export const templateSubphaseSchema = z.object({
  name: z.string().min(1).max(200),
  tasks: z.array(templateTaskSchema).default([]),
});

export const templatePhaseSchema = z.object({
  name: z.string().min(1).max(200),
  tasks: z.array(templateTaskSchema).default([]),
  subphases: z.array(templateSubphaseSchema).default([]),
});

export const projectTemplateStructureSchema = z.object({
  rootTasks: z.array(templateTaskSchema).default([]),
  phases: z.array(templatePhaseSchema).default([]),
});

export type TemplateTask = z.infer<typeof templateTaskSchema>;
export type TemplateSubphase = z.infer<typeof templateSubphaseSchema>;
export type TemplatePhase = z.infer<typeof templatePhaseSchema>;
export type ProjectTemplateStructure = z.infer<typeof projectTemplateStructureSchema>;

type PhaseRow = {
  id: string;
  parentPhaseId: string | null;
  name: string;
  sortOrder: number;
};

type TaskRow = {
  phaseId: string | null;
  title: string;
  timeEstimateMinutes: number | null;
  sortOrder: number;
};

function mapTaskRow(row: TaskRow): TemplateTask {
  return {
    title: row.title,
    ...(row.timeEstimateMinutes != null ? { timeEstimateMinutes: row.timeEstimateMinutes } : {}),
  };
}

function sortPhases(a: PhaseRow, b: PhaseRow): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

function sortTasks(a: TaskRow, b: TaskRow): number {
  return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
}

/** Serialize a project's phase/task tree into a reusable template structure. */
export function buildTemplateStructureFromProject(
  phaseRows: PhaseRow[],
  taskRows: TaskRow[]
): ProjectTemplateStructure {
  const sortedPhases = [...phaseRows].sort(sortPhases);
  const sortedTasks = [...taskRows].sort(sortTasks);

  const rootPhases = sortedPhases.filter((phase) => !phase.parentPhaseId);
  const subphasesByParent = new Map<string, PhaseRow[]>();
  for (const phase of sortedPhases) {
    if (!phase.parentPhaseId) continue;
    const list = subphasesByParent.get(phase.parentPhaseId) ?? [];
    list.push(phase);
    subphasesByParent.set(phase.parentPhaseId, list);
  }

  const tasksForPhase = (phaseId: string | null): TemplateTask[] =>
    sortedTasks.filter((task) => task.phaseId === phaseId).map(mapTaskRow);

  return {
    rootTasks: tasksForPhase(null),
    phases: rootPhases.map((phase) => ({
      name: phase.name,
      tasks: tasksForPhase(phase.id),
      subphases: (subphasesByParent.get(phase.id) ?? []).map((subphase) => ({
        name: subphase.name,
        tasks: tasksForPhase(subphase.id),
      })),
    })),
  };
}

export function countTemplateItems(structure: ProjectTemplateStructure): {
  phaseCount: number;
  taskCount: number;
} {
  let phaseCount = structure.phases.length;
  let taskCount = structure.rootTasks.length;

  for (const phase of structure.phases) {
    taskCount += phase.tasks.length;
    phaseCount += phase.subphases.length;
    for (const subphase of phase.subphases) {
      taskCount += subphase.tasks.length;
    }
  }

  return { phaseCount, taskCount };
}
