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

/** Single persistent thread for the Plan coach dock (Week · Month · Quarter · Year). */
export const PLAN_COACH_THREAD_ID = "plan:coach" as const;

/**
 * Surfaces that carry a permanently-pinned per-page coach dock (Today, Week,
 * Projects, etc.). Each maps to one persistent `coach:<surface>` thread so an
 * unfinished session resumes when the user returns to that page. Plan (and its
 * goals card) keep their own dedicated threads above and are intentionally absent.
 */
export const COACH_DOCK_SURFACES = [
  "today",
  "week",
  "projects",
  "loose-tasks",
  "backlog",
  "reviews",
] as const;
export type CoachDockSurface = (typeof COACH_DOCK_SURFACES)[number];

/** The persistent thread backing a page's coach dock. */
export function coachThreadId(surface: CoachDockSurface): string {
  return `coach:${surface}`;
}

export const threadIdSchema = z.union([
  z.literal(GLOBAL_THREAD_ID),
  z.literal(PLAN_COACH_THREAD_ID),
  z.string().regex(/^coach:(today|week|projects|loose-tasks|backlog|reviews)$/),
  z.string().regex(/^focus:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
]);

export type ThreadId = z.infer<typeof threadIdSchema>;

export function taskIdForThread(threadId: string): string | null {
  return parseFocusTaskId(threadId);
}

/** The shared Plan coach thread, reused across every long-horizon planning page. */
export function planCoachThreadId(): string {
  return PLAN_COACH_THREAD_ID;
}
