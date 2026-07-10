import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";

const DAY_MINUTES = 1440;

export type ExternalEventGeometryInput = {
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
};

/** Calendar date (YYYY-MM-DD) from a Google all-day UTC midnight timestamp. */
function calendarDateFromAllDayInstant(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function timedOverlapMinutes(
  event: ExternalEventGeometryInput,
  localDate: string,
  tzOffsetMinutes: number
): { startMin: number; endMin: number } | null {
  const { start: dayStart, end: dayEnd } = localDayUtcBounds(localDate, tzOffsetMinutes);

  if (event.endAt <= dayStart || event.startAt >= dayEnd) {
    return null;
  }

  const clipStartMs = Math.max(event.startAt.getTime(), dayStart.getTime());
  const clipEndMs = Math.min(event.endAt.getTime(), dayEnd.getTime());
  if (clipStartMs >= clipEndMs) return null;

  const startMin = Math.max(0, Math.min(DAY_MINUTES, (clipStartMs - dayStart.getTime()) / 60_000));
  const endMin = Math.max(0, Math.min(DAY_MINUTES, (clipEndMs - dayStart.getTime()) / 60_000));

  if (startMin >= endMin) return null;
  return { startMin, endMin };
}

function allDayOverlapMinutes(
  event: ExternalEventGeometryInput,
  localDate: string
): { startMin: number; endMin: number } | null {
  const startDate = calendarDateFromAllDayInstant(event.startAt);
  const endDate = calendarDateFromAllDayInstant(event.endAt);
  if (localDate < startDate || localDate >= endDate) return null;
  return { startMin: 0, endMin: DAY_MINUTES };
}

/**
 * Map one external calendar event to local wall-clock minutes on `localDate`,
 * or null when the event does not overlap that day.
 */
export function eventToDayMinutes(
  event: ExternalEventGeometryInput,
  localDate: string,
  tzOffsetMinutes: number
): { startMin: number; endMin: number } | null {
  if (event.isAllDay) {
    return allDayOverlapMinutes(event, localDate);
  }
  return timedOverlapMinutes(event, localDate, tzOffsetMinutes);
}
