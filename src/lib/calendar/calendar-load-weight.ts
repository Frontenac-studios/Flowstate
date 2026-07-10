import { sumBusyMinutes } from "@/lib/calendar/build-day-busy-intervals";
import {
  eventToDayMinutes,
  type ExternalEventGeometryInput,
} from "@/lib/calendar/event-to-day-minutes";
import { ALL_DAY_EVENT_WEIGHT, CALENDAR_HOUR_WEIGHT } from "@/lib/week/task-load-weight";

export type CalendarDayEventSlice = {
  isAllDay: boolean;
  startMin: number;
  endMin: number;
};

export type CalendarLoadSummary = {
  loadWeight: number;
  busyMinutes: number;
  timedEventCount: number;
  allDayEventCount: number;
  eventCount: number;
};

/** Derive load summary from pre-sliced day events (client `listForDate` / `listForWeek`). */
export function calendarLoadSummaryFromDayEvents(
  events: ReadonlyArray<CalendarDayEventSlice>
): CalendarLoadSummary {
  const timed = events.filter((event) => !event.isAllDay);
  const allDayEventCount = events.length - timed.length;
  const busyMinutes = sumBusyMinutes(
    timed.map((event) => ({ startMin: event.startMin, endMin: event.endMin }))
  );
  const loadWeight =
    Math.ceil(busyMinutes / 60) * CALENDAR_HOUR_WEIGHT + allDayEventCount * ALL_DAY_EVENT_WEIGHT;

  return {
    loadWeight,
    busyMinutes,
    timedEventCount: timed.length,
    allDayEventCount,
    eventCount: events.length,
  };
}

/** Derive load summary from raw stored events for a single local date. */
export function calendarLoadSummaryFromStoredEvents(
  events: readonly ExternalEventGeometryInput[],
  localDate: string,
  tzOffsetMinutes: number
): CalendarLoadSummary {
  const slices: CalendarDayEventSlice[] = [];

  for (const event of events) {
    const geometry = eventToDayMinutes(event, localDate, tzOffsetMinutes);
    if (!geometry) continue;
    slices.push({
      isAllDay: event.isAllDay,
      startMin: geometry.startMin,
      endMin: geometry.endMin,
    });
  }

  return calendarLoadSummaryFromDayEvents(slices);
}

export function formatCalendarMeetingSummary(
  timedEventCount: number,
  busyMinutes: number
): string | null {
  if (timedEventCount === 0 && busyMinutes === 0) return null;

  const hours = Math.floor(busyMinutes / 60);
  const minutes = busyMinutes % 60;
  const duration =
    hours > 0 && minutes > 0 ? `${hours}h ${minutes}m` : hours > 0 ? `${hours}h` : `${minutes}m`;
  const meetingLabel = timedEventCount === 1 ? "1 meeting" : `${timedEventCount} meetings`;
  return `${meetingLabel} · ${duration}`;
}
