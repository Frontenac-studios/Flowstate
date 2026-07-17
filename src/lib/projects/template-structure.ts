import { z } from "zod";

export const templateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  timeEstimateMinutes: z.number().int().positive().nullable().optional(),
});

export type TemplateTask = z.infer<typeof templateTaskSchema>;

/** Recursive phase node — unlimited nesting via `subphases`. */
export type TemplatePhase = {
  name: string;
  tasks: TemplateTask[];
  subphases: TemplatePhase[];
};

export const templatePhaseSchema: z.ZodType<TemplatePhase> = z.lazy(() =>
  z.object({
    name: z.string().min(1).max(200),
    tasks: z.array(templateTaskSchema).default([]),
    subphases: z.array(templatePhaseSchema).default([]),
  })
);

/** @deprecated Alias — prefer TemplatePhase (nodes are recursive). */
export type TemplateSubphase = TemplatePhase;

export const projectTemplateStructureSchema = z.object({
  rootTasks: z.array(templateTaskSchema).default([]),
  phases: z.array(templatePhaseSchema).default([]),
});

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

  const childrenByParent = new Map<string, PhaseRow[]>();
  const roots: PhaseRow[] = [];
  for (const phase of sortedPhases) {
    if (!phase.parentPhaseId) {
      roots.push(phase);
      continue;
    }
    const list = childrenByParent.get(phase.parentPhaseId) ?? [];
    list.push(phase);
    childrenByParent.set(phase.parentPhaseId, list);
  }

  const tasksForPhase = (phaseId: string | null): TemplateTask[] =>
    sortedTasks.filter((task) => task.phaseId === phaseId).map(mapTaskRow);

  const buildNode = (phase: PhaseRow): TemplatePhase => ({
    name: phase.name,
    tasks: tasksForPhase(phase.id),
    subphases: (childrenByParent.get(phase.id) ?? []).map(buildNode),
  });

  return {
    rootTasks: tasksForPhase(null),
    phases: roots.map(buildNode),
  };
}

function countPhaseTree(phases: readonly TemplatePhase[]): {
  phaseCount: number;
  taskCount: number;
} {
  let phaseCount = 0;
  let taskCount = 0;
  const walk = (nodes: readonly TemplatePhase[]) => {
    for (const phase of nodes) {
      phaseCount += 1;
      taskCount += phase.tasks.length;
      walk(phase.subphases);
    }
  };
  walk(phases);
  return { phaseCount, taskCount };
}

export function countTemplateItems(structure: ProjectTemplateStructure): {
  phaseCount: number;
  taskCount: number;
} {
  const nested = countPhaseTree(structure.phases);
  return {
    phaseCount: nested.phaseCount,
    taskCount: structure.rootTasks.length + nested.taskCount,
  };
}
