import { z } from "zod";

export const GLOBAL_THREAD_ID = "global" as const;

export function focusThreadId(taskId: string): string {
  return `focus:${taskId}`;
}

export function parseFocusTaskId(threadId: string): string | null {
  if (!threadId.startsWith("focus:")) return null;
  const taskId = threadId.slice("focus:".length);
  return z.string().uuid().safeParse(taskId).success ? taskId : null;
}

export const threadIdSchema = z.union([
  z.literal(GLOBAL_THREAD_ID),
  z.string().regex(/^focus:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  z.string().regex(/^goals:\d{4}$/),
]);

export type ThreadId = z.infer<typeof threadIdSchema>;

export function taskIdForThread(threadId: string): string | null {
  return parseFocusTaskId(threadId);
}

/** One persistent goals-coaching thread per card year (so a session resumes later). */
export function goalsCoachThreadId(cardYear: number): string {
  return `goals:${cardYear}`;
}

export function parseGoalsCoachYear(threadId: string): number | null {
  if (!threadId.startsWith("goals:")) return null;
  const year = Number(threadId.slice("goals:".length));
  return Number.isInteger(year) && year >= 1900 && year <= 3000 ? year : null;
}
