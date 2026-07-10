import "server-only";

import { and, eq, gt, lt, ne } from "drizzle-orm";

import { db } from "@/db";
import { externalCalendarEvents } from "@/db/tables";
import { calendarLoadSummaryFromStoredEvents } from "@/lib/calendar/calendar-load-weight";
import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";

export async function fetchExternalCalendarLoadWeight(
  userId: string,
  localDate: string,
  tzOffsetMinutes: number
): Promise<number> {
  const { start, end } = localDayUtcBounds(localDate, tzOffsetMinutes);
  const rows = await db
    .select({
      startAt: externalCalendarEvents.startAt,
      endAt: externalCalendarEvents.endAt,
      isAllDay: externalCalendarEvents.isAllDay,
    })
    .from(externalCalendarEvents)
    .where(
      and(
        eq(externalCalendarEvents.userId, userId),
        ne(externalCalendarEvents.status, "cancelled"),
        lt(externalCalendarEvents.startAt, end),
        gt(externalCalendarEvents.endAt, start)
      )
    );

  return calendarLoadSummaryFromStoredEvents(rows, localDate, tzOffsetMinutes).loadWeight;
}

export async function fetchExternalCalendarLoadWeightsByDate(input: {
  userId: string;
  dates: readonly string[];
  tzOffsetMinutes: number;
}): Promise<Map<string, number>> {
  const weights = new Map<string, number>();
  if (input.dates.length === 0) return weights;

  const sortedDates = [...input.dates].sort();
  const { start } = localDayUtcBounds(sortedDates[0]!, input.tzOffsetMinutes);
  const { end } = localDayUtcBounds(sortedDates[sortedDates.length - 1]!, input.tzOffsetMinutes);

  const rows = await db
    .select({
      startAt: externalCalendarEvents.startAt,
      endAt: externalCalendarEvents.endAt,
      isAllDay: externalCalendarEvents.isAllDay,
    })
    .from(externalCalendarEvents)
    .where(
      and(
        eq(externalCalendarEvents.userId, input.userId),
        ne(externalCalendarEvents.status, "cancelled"),
        lt(externalCalendarEvents.startAt, end),
        gt(externalCalendarEvents.endAt, start)
      )
    );

  for (const date of input.dates) {
    const summary = calendarLoadSummaryFromStoredEvents(rows, date, input.tzOffsetMinutes);
    if (summary.loadWeight > 0) {
      weights.set(date, summary.loadWeight);
    }
  }

  return weights;
}
