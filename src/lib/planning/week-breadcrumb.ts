import {
  addDays,
  datesInIsoWeek,
  parseISODateString,
  startOfIsoWeekMonday,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";

import type { PlanningBreadcrumb } from "./horizon-storage";

/** ISO week number (1–53) for a local calendar date. */
export function isoWeekNumber(ref: Date): number {
  const date = startOfLocalDay(ref);
  const thursday = addDays(date, 3 - ((date.getDay() + 6) % 7));
  const yearStart = startOfLocalDay(new Date(thursday.getFullYear(), 0, 1));
  const firstThursday = addDays(yearStart, 3 - ((yearStart.getDay() + 6) % 7));
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

/** Monday of ISO week `isoWeek` in calendar `year` (planning breadcrumb context). */
export function mondayFromIsoWeek(year: number, isoWeek: number): Date {
  const jan4 = new Date(year, 0, 4);
  const week1Monday = startOfIsoWeekMonday(jan4);
  return addDays(week1Monday, (isoWeek - 1) * 7);
}

/** Whether the breadcrumb carries enough context to scope a week grid. */
export function isWeekBreadcrumbScoped(breadcrumb: PlanningBreadcrumb): boolean {
  return breadcrumb.isoWeek != null || breadcrumb.month != null || breadcrumb.year != null;
}

/**
 * Anchor date (Monday ISO string) for the week implied by the breadcrumb.
 * Uses explicit isoWeek when set; otherwise derives from year/month relative to `now`.
 */
export function resolveWeekAnchorDate(
  breadcrumb: PlanningBreadcrumb,
  now: Date = new Date()
): string {
  if (breadcrumb.isoWeek != null) {
    return toISODateString(mondayFromIsoWeek(breadcrumb.year, breadcrumb.isoWeek));
  }

  if (breadcrumb.month != null) {
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    if (breadcrumb.year === nowYear && breadcrumb.month === nowMonth) {
      return toISODateString(startOfIsoWeekMonday(now));
    }
    const midMonth = startOfLocalDay(new Date(breadcrumb.year, breadcrumb.month - 1, 15));
    return toISODateString(startOfIsoWeekMonday(midMonth));
  }

  if (breadcrumb.year === now.getFullYear()) {
    return toISODateString(startOfIsoWeekMonday(now));
  }

  return toISODateString(startOfIsoWeekMonday(new Date(breadcrumb.year, 0, 4)));
}

/** ISO week number for the breadcrumb's scoped week (fills missing isoWeek segment). */
export function deriveIsoWeekForBreadcrumb(
  breadcrumb: PlanningBreadcrumb,
  now: Date = new Date()
): number {
  const anchor = parseISODateString(resolveWeekAnchorDate(breadcrumb, now));
  return isoWeekNumber(anchor);
}

/** All ISO date strings Mon–Sun for a breadcrumb-scoped week. */
export function weekDatesForBreadcrumb(
  breadcrumb: PlanningBreadcrumb,
  now: Date = new Date()
): string[] {
  const anchor = parseISODateString(resolveWeekAnchorDate(breadcrumb, now));
  return datesInIsoWeek(anchor).map(toISODateString);
}
