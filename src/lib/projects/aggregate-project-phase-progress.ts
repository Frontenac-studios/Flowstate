import { weightedProgress, type WeightedProgressInput } from "./weighted-progress";

export type ProgressTaskRow = {
  projectId: string;
  phaseId: string | null;
  completed: boolean;
  isHeavy: boolean;
};

export type PhaseProgressRow = {
  phaseId: string;
  phaseName: string;
  percent: number;
  completedWeight: number;
  totalWeight: number;
};

export type ProjectProgressRow = {
  projectId: string;
  projectName: string;
  percent: number;
  completedWeight: number;
  totalWeight: number;
  phases: PhaseProgressRow[];
};

function toWeightedInputs(tasks: readonly ProgressTaskRow[]): WeightedProgressInput[] {
  return tasks.map((task) => ({ completed: task.completed, isHeavy: task.isHeavy }));
}

/** Roll up §9 weighted progress per project and nested phase. */
export function aggregateProjectPhaseProgress(
  tasks: readonly ProgressTaskRow[],
  phases: readonly { id: string; projectId: string; name: string }[],
  projectNames: ReadonlyMap<string, string>
): ProjectProgressRow[] {
  const tasksByProject = new Map<string, ProgressTaskRow[]>();
  for (const task of tasks) {
    const list = tasksByProject.get(task.projectId) ?? [];
    list.push(task);
    tasksByProject.set(task.projectId, list);
  }

  const phasesByProject = new Map<string, { id: string; projectId: string; name: string }[]>();
  for (const phase of phases) {
    const list = phasesByProject.get(phase.projectId) ?? [];
    list.push(phase);
    phasesByProject.set(phase.projectId, list);
  }

  const rows: ProjectProgressRow[] = [];

  for (const [projectId, projectTasks] of Array.from(tasksByProject.entries())) {
    const projectName = projectNames.get(projectId);
    if (!projectName) continue;

    const projectTotals = weightedProgress(toWeightedInputs(projectTasks));
    const phaseRows: PhaseProgressRow[] = [];

    for (const phase of phasesByProject.get(projectId) ?? []) {
      const phaseTasks = projectTasks.filter((task) => task.phaseId === phase.id);
      if (phaseTasks.length === 0) continue;
      phaseRows.push({
        phaseId: phase.id,
        phaseName: phase.name,
        ...weightedProgress(toWeightedInputs(phaseTasks)),
      });
    }

    const unphasedTasks = projectTasks.filter((task) => task.phaseId === null);
    if (unphasedTasks.length > 0) {
      phaseRows.push({
        phaseId: `${projectId}:unphased`,
        phaseName: "No phase",
        ...weightedProgress(toWeightedInputs(unphasedTasks)),
      });
    }

    phaseRows.sort((a, b) => b.totalWeight - a.totalWeight);

    rows.push({
      projectId,
      projectName,
      ...projectTotals,
      phases: phaseRows,
    });
  }

  rows.sort((a, b) => b.totalWeight - a.totalWeight);
  return rows;
}
