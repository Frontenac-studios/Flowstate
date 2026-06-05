export type DuplicateTaskRef = {
  id: string;
  title: string;
  projectId: string | null;
  phaseId?: string | null;
  completedAt?: Date | string | null;
};

export type DuplicateLineContext = {
  lineIndex: number;
  title: string;
  projectId: string | null;
  phaseId: string | null;
  /** When true, skip matching against existing tasks (e.g. target phase does not exist yet). */
  skipExistingCheck?: boolean;
};

export type DuplicateTaskWarning = {
  lineIndex: number;
  title: string;
  existingTaskId?: string;
  matchKind: "existing" | "batch";
  phaseId: string | null;
  projectId: string | null;
};

export function normalizeTaskTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function duplicateMatchKey(
  title: string,
  projectId: string | null,
  phaseId: string | null
): string {
  return `${projectId ?? ""}:${phaseId ?? ""}:${normalizeTaskTitle(title)}`;
}

function isIncomplete(task: DuplicateTaskRef): boolean {
  return task.completedAt == null;
}

export type DetectDuplicateTaskWarningsParams = {
  lines: DuplicateLineContext[];
  existingTasks: DuplicateTaskRef[];
};

export function detectDuplicateTaskWarnings({
  lines,
  existingTasks,
}: DetectDuplicateTaskWarningsParams): DuplicateTaskWarning[] {
  const warnings: DuplicateTaskWarning[] = [];
  const incompleteExisting = existingTasks.filter(isIncomplete);

  const existingByKey = new Map<string, DuplicateTaskRef>();
  for (const task of incompleteExisting) {
    const key = duplicateMatchKey(task.title, task.projectId, task.phaseId ?? null);
    if (!existingByKey.has(key)) {
      existingByKey.set(key, task);
    }
  }

  const seenBatchKeys = new Map<string, number>();

  for (const line of lines) {
    const key = duplicateMatchKey(line.title, line.projectId, line.phaseId);

    if (!line.skipExistingCheck) {
      const existing = existingByKey.get(key);
      if (existing) {
        warnings.push({
          lineIndex: line.lineIndex,
          title: line.title,
          existingTaskId: existing.id,
          matchKind: "existing",
          phaseId: line.phaseId,
          projectId: line.projectId,
        });
      }
    }

    const firstBatchLineIndex = seenBatchKeys.get(key);
    if (firstBatchLineIndex !== undefined && firstBatchLineIndex !== line.lineIndex) {
      const alreadyWarnedBatch = warnings.some(
        (w) => w.lineIndex === line.lineIndex && w.matchKind === "batch"
      );
      if (!alreadyWarnedBatch) {
        warnings.push({
          lineIndex: line.lineIndex,
          title: line.title,
          matchKind: "batch",
          phaseId: line.phaseId,
          projectId: line.projectId,
        });
      }
    } else if (firstBatchLineIndex === undefined) {
      seenBatchKeys.set(key, line.lineIndex);
    }
  }

  return warnings.sort((a, b) => a.lineIndex - b.lineIndex);
}
