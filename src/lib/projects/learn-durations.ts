import type { ProjectTemplateStructure, TemplatePhase, TemplateTask } from "./template-structure";

type DurationSample = {
  title: string;
  /** Preferred: actual focus minutes; falls back to the task's estimate. */
  minutes: number;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Mean minutes per normalized task title from similar past projects. */
export function averageDurationsByTitle(samples: readonly DurationSample[]): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();

  for (const sample of samples) {
    const key = normalizeTitle(sample.title);
    if (!key || sample.minutes <= 0) continue;
    const entry = sums.get(key) ?? { total: 0, count: 0 };
    entry.total += sample.minutes;
    entry.count += 1;
    sums.set(key, entry);
  }

  const averages = new Map<string, number>();
  for (const [key, entry] of Array.from(sums.entries())) {
    averages.set(key, Math.round(entry.total / entry.count));
  }
  return averages;
}

function applyTaskDurations(tasks: TemplateTask[], averages: Map<string, number>): TemplateTask[] {
  return tasks.map((task) => {
    const learned = averages.get(normalizeTitle(task.title));
    if (learned == null) return task;
    return { ...task, timeEstimateMinutes: learned };
  });
}

function applyPhaseDurations(
  phases: TemplatePhase[],
  averages: Map<string, number>
): TemplatePhase[] {
  return phases.map((phase) => ({
    ...phase,
    tasks: applyTaskDurations(phase.tasks, averages),
    subphases: applyPhaseDurations(phase.subphases, averages),
  }));
}

/**
 * Overlay learned durations from similar projects onto a template structure.
 * Tasks without a title match keep their template estimate (or null).
 */
export function applyLearnedDurations(
  structure: ProjectTemplateStructure,
  samples: readonly DurationSample[]
): ProjectTemplateStructure {
  const averages = averageDurationsByTitle(samples);
  if (averages.size === 0) return structure;

  return {
    rootTasks: applyTaskDurations(structure.rootTasks, averages),
    phases: applyPhaseDurations(structure.phases, averages),
  };
}
