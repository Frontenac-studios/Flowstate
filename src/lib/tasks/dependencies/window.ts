import { partitionPlanTasks, type PlanTask } from "@/lib/tasks/partition-plan-tasks";

/**
 * Absolute instant the current window week ends, for a window edge's `expires_at`
 * (3.i). Returns the **start of next Monday** in the creator's timezone, so the
 * edge is active through Sunday and the pg_cron sweep / read-time guard is tz-agnostic.
 *
 * `tzOffsetMinutes` follows the app convention: minutes east of UTC
 * (`-new Date().getTimezoneOffset()`).
 */
export function endOfWindowWeek(now: Date, tzOffsetMinutes: number): Date {
  // Shift to the creator's local wall-clock, then read UTC fields off the shifted Date.
  const local = new Date(now.getTime() + tzOffsetMinutes * 60_000);
  const dow = local.getUTCDay(); // 0 = Sun … 6 = Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  // Local midnight of next Monday (Date.UTC normalizes day under/overflow).
  const nextMondayLocalMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysFromMonday + 7
  );
  // Convert that local wall-clock back to an absolute UTC instant.
  return new Date(nextMondayLocalMidnight - tzOffsetMinutes * 60_000);
}

/**
 * A task is "in window" (eligible for a window edge) when it's scheduled into
 * Today / Tomorrow / This Week — i.e. anything but the `later` bucket. Reuses the
 * canonical bucketer so eligibility matches what the user sees.
 */
export function isTaskInWindow(task: PlanTask, now: Date = new Date()): boolean {
  const p = partitionPlanTasks([task], now);
  return p.today.length + p.tomorrow.length + p.thisWeek.length > 0;
}
