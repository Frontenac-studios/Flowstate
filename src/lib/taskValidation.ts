/**
 * Task title validation shared between the client composers/editors and mirrored
 * against the server-side bound (`z.string().min(1).max(500)` in
 * `src/trpc/routers/tasks.ts`). Keep `MAX_TASK_TITLE_LENGTH` in sync with that schema.
 */

export const MAX_TASK_TITLE_LENGTH = 500;

/**
 * Returns a human-readable error string for an invalid task title, or `null` when
 * the title is acceptable. Validates against the trimmed value so trailing/leading
 * whitespace can't satisfy the minimum-length requirement.
 */
export function getTaskTitleError(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Add a task name.";
  if (trimmed.length > MAX_TASK_TITLE_LENGTH) {
    return `Task is too long — keep it under ${MAX_TASK_TITLE_LENGTH} characters.`;
  }
  return null;
}
