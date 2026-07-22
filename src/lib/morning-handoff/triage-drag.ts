/** Drag ids for the morning-triage modal (task sources, bins, and the Today cart). */

export const TRIAGE_TASK_PREFIX = "triage-task:";

export const TRIAGE_BIN_LATER_ID = "triage-bin:later";
export const TRIAGE_BIN_DONE_ID = "triage-bin:done";
export const TRIAGE_BIN_DROP_ID = "triage-bin:drop";
export const TRIAGE_TODAY_DROP_ID = "triage-today-section";

export type TriageDropAction = "today" | "later" | "done" | "drop";

const ACTION_BY_OVER_ID: Record<string, TriageDropAction> = {
  [TRIAGE_TODAY_DROP_ID]: "today",
  [TRIAGE_BIN_LATER_ID]: "later",
  [TRIAGE_BIN_DONE_ID]: "done",
  [TRIAGE_BIN_DROP_ID]: "drop",
};

/**
 * Task id from a triage drag id. Slices the prefix rather than splitting on
 * ":" — recurring occurrence ids are `rec:<uuid>:<date>`.
 */
export function parseTriageDragTaskId(activeId: string): string | null {
  if (!activeId.startsWith(TRIAGE_TASK_PREFIX)) return null;
  const taskId = activeId.slice(TRIAGE_TASK_PREFIX.length);
  return taskId.length > 0 ? taskId : null;
}

/** The whole onDragEnd dispatch as a pure function: null when the drop is a no-op. */
export function resolveTriageDrop(
  activeId: string,
  overId: string | null
): { taskId: string; action: TriageDropAction } | null {
  const taskId = parseTriageDragTaskId(activeId);
  if (!taskId || overId == null) return null;
  const action = ACTION_BY_OVER_ID[overId];
  if (!action) return null;
  return { taskId, action };
}
