import { formatRelativeDue } from "./format-relative-due";
import { parseISODateString } from "./local-day";

/**
 * Spec v2/v5 due pill. `pill` = overdue (crimson on soft crimson) or today (ink on
 * soft gray) — always shown on a row. `muted` = a future date, shown as plain muted
 * text and only when the due lens is on.
 */
export type DuePill = { text: string; tone: "overdue" | "today" | "muted" };

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** A date within a week either side reads as its weekday ("Fri"); further out, "Sep 3". */
function shortDate(scheduledDate: string, days: number): string {
  const date = parseISODateString(scheduledDate);
  return Math.abs(days) < 7 ? WEEKDAY.format(date) : MONTH_DAY.format(date);
}

export function formatDuePill(
  scheduledDate: string | null | undefined,
  today: Date = new Date()
): DuePill | null {
  const relative = formatRelativeDue(scheduledDate, today);
  if (!relative || !scheduledDate) return null;
  if (relative.days < 0) return { text: shortDate(scheduledDate, relative.days), tone: "overdue" };
  if (relative.days === 0) return { text: "Today", tone: "today" };
  if (relative.days === 1) return { text: "Tomorrow", tone: "muted" };
  return { text: shortDate(scheduledDate, relative.days), tone: "muted" };
}
