/**
 * A window event asking a mounted `TaskRow` to run its own completion (D5's
 * `Cmd+Shift+D`). Keyboard-driven completion goes through the row rather than
 * lifting the mutation out of it, so the optimistic slide-out choreography,
 * occurrence branching, and undo toast stay in one place — identical to a swipe
 * or (until PR 4) a checkbox click. Matches the repo's existing custom-event
 * idiom (`CHAT_SEND_EVENT`, `DECIDE_EVENT`).
 */
export const COMPLETE_TASK_EVENT = "kash:complete-task";

type CompleteTaskDetail = { taskId: string };

export function dispatchCompleteTask(taskId: string): void {
  window.dispatchEvent(
    new CustomEvent<CompleteTaskDetail>(COMPLETE_TASK_EVENT, {
      detail: { taskId },
    })
  );
}

/** Subscribe a row to completion requests; returns an unsubscribe fn. */
export function onCompleteTaskRequest(handler: (taskId: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<CompleteTaskDetail>).detail;
    if (detail?.taskId) handler(detail.taskId);
  };
  window.addEventListener(COMPLETE_TASK_EVENT, listener);
  return () => window.removeEventListener(COMPLETE_TASK_EVENT, listener);
}
