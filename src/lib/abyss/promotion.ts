import { addDays, datesInIsoWeek, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

/**
 * Pure promotion logic for the Abyss (sub-phase 8B). Promotion lifts an item into a
 * real target (Today/Week task, project, or annual goal); the item itself *stays* in
 * the deep with `status = promoted`. If the spawned task is later completed or
 * abandoned, the item quietly returns — see {@link selectCameBack}. Framework-free
 * and unit-tested; the tRPC router does the DB writes.
 */

/** The four promotion destinations offered by the picker. */
export type AbyssPromotionTarget = "today" | "week" | "project" | "goal";

/** Task-lane targets spawn a real task (and so can "come back"); the rest link a non-task. */
export type AbyssTaskLane = "today" | "week";

/**
 * `promoted_target` encoding. Task lanes store the bare lane (`"today"`/`"week"`); a
 * project/goal stores its kind plus the spawned row id (`"project:<uuid>"`) so the
 * List can deep-link and the came-back check can tell task promotions apart.
 */
export function encodePromotedTarget(target: AbyssPromotionTarget, spawnedId?: string): string {
  if (target === "today" || target === "week") return target;
  if (!spawnedId) throw new Error(`promoted target "${target}" needs a spawned id`);
  return `${target}:${spawnedId}`;
}

export type DecodedPromotedTarget =
  | { kind: "today" }
  | { kind: "week" }
  | { kind: "project"; id: string }
  | { kind: "goal"; id: string }
  | null;

/** Parse a stored `promoted_target` back into a typed descriptor (null if absent/unknown). */
export function decodePromotedTarget(raw: string | null | undefined): DecodedPromotedTarget {
  if (!raw) return null;
  if (raw === "today") return { kind: "today" };
  if (raw === "week") return { kind: "week" };
  const sep = raw.indexOf(":");
  if (sep === -1) return null;
  const kind = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  if (!id) return null;
  if (kind === "project") return { kind: "project", id };
  if (kind === "goal") return { kind: "goal", id };
  return null;
}

/** Task-lane promotions are the only ones eligible for the "it came back" return. */
export function isTaskLaneTarget(raw: string | null | undefined): boolean {
  return raw === "today" || raw === "week";
}

/**
 * Scheduled date (YYYY-MM-DD, local) for a task-lane promotion. "Today" lands today;
 * "Week" lands tomorrow so it reads as soon-but-not-now, clamped to the last day of
 * the current ISO week (on the final weekday there is no later in-week slot, so it
 * coincides with today).
 */
export function scheduledDateForLane(lane: AbyssTaskLane, now: Date): string {
  const today = startOfLocalDay(now);
  if (lane === "today") return toISODateString(today);

  const weekIsos = datesInIsoWeek(now).map(toISODateString);
  const tomorrowIso = toISODateString(addDays(today, 1));
  if (weekIsos.includes(tomorrowIso)) return tomorrowIso;
  return weekIsos[weekIsos.length - 1];
}

/** The promoted-item fields the came-back reconcile inspects. */
export interface PromotedItemState {
  id: string;
  status: "active" | "promoted" | "archived";
  promotedTarget: string | null;
  promotedTaskId: string | null;
}

/** The spawned-task fields the came-back reconcile inspects. */
export interface SpawnedTaskState {
  id: string;
  completedAt: Date | null;
}

/**
 * Decide which promoted items should return to `active` ("it came back"). A task-lane
 * promotion returns when its spawned task is completed (`completedAt` set) or abandoned
 * — the FK is cleared on delete (`promotedTaskId` null) or the task is simply gone from
 * the lookup. Non-task promotions (project/goal) never auto-return. Returns the ids to
 * revert; the router flips them and counts the return as a resurface.
 */
export function selectCameBack(
  items: PromotedItemState[],
  tasksById: Map<string, SpawnedTaskState>
): string[] {
  const cameBack: string[] = [];
  for (const item of items) {
    if (item.status !== "promoted") continue;
    if (!isTaskLaneTarget(item.promotedTarget)) continue;

    if (!item.promotedTaskId) {
      cameBack.push(item.id); // task deleted — FK set null
      continue;
    }
    const task = tasksById.get(item.promotedTaskId);
    if (!task || task.completedAt != null) {
      cameBack.push(item.id); // gone, or finished
    }
  }
  return cameBack;
}
