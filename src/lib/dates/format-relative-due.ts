import { parseISODateString, startOfLocalDay } from "./local-day";

export type DueEmphasis = "danger" | "warning" | "muted";

export type RelativeDue = {
  /** "today" | "in 3d" | "overdue 2d" */
  text: string;
  emphasis: DueEmphasis;
  /** Signed day delta from today; negative = overdue. */
  days: number;
};

const MS_PER_DAY = 86_400_000;

/**
 * VF-1 due lens: a calm relative label for a task's scheduled date.
 * Returns null when there's no date. Day-grouped surfaces (Today, This Week)
 * suppress this entirely — the caller decides via `suppressOnDayGroup`.
 */
export function formatRelativeDue(
  scheduledDate: string | null | undefined,
  today: Date = new Date()
): RelativeDue | null {
  if (!scheduledDate) return null;
  const todayStart = startOfLocalDay(today).getTime();
  const dueStart = startOfLocalDay(parseISODateString(scheduledDate)).getTime();
  const days = Math.round((dueStart - todayStart) / MS_PER_DAY);

  if (days === 0) return { text: "today", emphasis: "warning", days: 0 };
  if (days < 0) return { text: `overdue ${-days}d`, emphasis: "danger", days };
  return { text: `in ${days}d`, emphasis: "muted", days };
}
