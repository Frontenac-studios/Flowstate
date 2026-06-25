import type { ProjectCategory } from "@/lib/projects/categories";

/**
 * One completed-or-running time entry, pre-joined with the task's derived
 * category and (optional) project. Category is always derived from the task
 * (decision 2.1 — no snapshot column); `projectId`/`projectName` are null for
 * loose tasks.
 */
export type WeekEntryInput = {
  startedAt: Date;
  endedAt: Date | null;
  category: ProjectCategory;
  projectId: string | null;
  projectName: string | null;
};

export type CategoryRollup = {
  category: ProjectCategory;
  seconds: number;
};

/** `projectId === null` is the synthetic "loose tasks" bucket. */
export type ProjectRollup = {
  projectId: string | null;
  projectName: string | null;
  seconds: number;
};

export type WeekRollup = {
  totalSeconds: number;
  /** Distinct tasks-with-focus is a per-entry concern; we expose entry count. */
  entryCount: number;
  byCategory: CategoryRollup[];
  byProject: ProjectRollup[];
};

/**
 * Sum focus seconds for a week's entries, grouped by derived category and by
 * project. A still-running entry (`endedAt === null`) counts up to `now`,
 * mirroring `aggregateFocusToday`. Both groupings are sorted by seconds desc;
 * loose tasks collapse into a single `projectId: null` bucket.
 */
export function aggregateWeek(params: { entries: WeekEntryInput[]; now?: Date }): WeekRollup {
  const now = params.now ?? new Date();
  const byCategory = new Map<ProjectCategory, number>();
  const byProject = new Map<string | null, { name: string | null; seconds: number }>();

  let totalSeconds = 0;
  let entryCount = 0;

  for (const entry of params.entries) {
    const end = entry.endedAt ?? now;
    const deltaMs = end.getTime() - entry.startedAt.getTime();
    const seconds = Math.floor(deltaMs / 1000);
    if (seconds <= 0) continue;

    totalSeconds += seconds;
    entryCount += 1;

    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + seconds);

    const existing = byProject.get(entry.projectId);
    if (existing) {
      existing.seconds += seconds;
    } else {
      byProject.set(entry.projectId, { name: entry.projectName, seconds });
    }
  }

  const categoryRollup: CategoryRollup[] = Array.from(byCategory.entries())
    .map(([category, seconds]) => ({ category, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const projectRollup: ProjectRollup[] = Array.from(byProject.entries())
    .map(([projectId, { name, seconds }]) => ({ projectId, projectName: name, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    totalSeconds,
    entryCount,
    byCategory: categoryRollup,
    byProject: projectRollup,
  };
}
