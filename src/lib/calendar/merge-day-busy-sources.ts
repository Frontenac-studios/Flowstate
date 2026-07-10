import {
  eventToDayMinutes,
  type ExternalEventGeometryInput,
} from "@/lib/calendar/event-to-day-minutes";
import type { Interval } from "@/lib/timeline/living-record";

export type FocusBlockBusySource = { startMin: number; endMin: number };

export type ProtectedBlockBusySource = {
  startMin: number | null;
  endMin: number | null;
};

export type ExternalEventBusySource = {
  startMin: number;
  endMin: number;
  isAllDay: boolean;
  status?: "confirmed" | "tentative" | "cancelled";
};

export type StoredExternalEventBusySource = ExternalEventGeometryInput & {
  status?: "confirmed" | "tentative" | "cancelled";
};

/** Concatenate focus, timed protected, and timed external intervals for gap/hold geometry. */
export function mergeDayBusySources(sources: {
  focusBlocks: ReadonlyArray<FocusBlockBusySource>;
  protectedBlocks: ReadonlyArray<ProtectedBlockBusySource>;
  externalEvents?: ReadonlyArray<ExternalEventBusySource>;
}): Interval[] {
  const intervals: Interval[] = [
    ...sources.focusBlocks.map((block) => ({ startMin: block.startMin, endMin: block.endMin })),
    ...sources.protectedBlocks
      .filter((block) => block.startMin != null && block.endMin != null)
      .map((block) => ({ startMin: block.startMin!, endMin: block.endMin! })),
  ];

  for (const event of sources.externalEvents ?? []) {
    if (event.isAllDay || event.status === "cancelled") continue;
    intervals.push({ startMin: event.startMin, endMin: event.endMin });
  }

  return intervals;
}

/** Map stored external events to timed busy intervals for one local day (server path). */
export function externalStoredEventsToBusyIntervals(
  events: ReadonlyArray<StoredExternalEventBusySource>,
  localDate: string,
  tzOffsetMinutes: number
): Interval[] {
  const intervals: Interval[] = [];

  for (const event of events) {
    if (event.isAllDay || event.status === "cancelled") continue;
    const geometry = eventToDayMinutes(event, localDate, tzOffsetMinutes);
    if (geometry) intervals.push(geometry);
  }

  return intervals;
}
