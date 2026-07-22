import { formatHoldSlotLabel } from "@/lib/morning-handoff/handoff-task-filters";

export type MeetingTooltipEvent = {
  title: string | null;
  startMin: number;
  endMin: number;
  isAllDay: boolean;
};

export type MeetingTooltipLine = {
  key: string;
  timeLabel: string;
  title: string;
};

/** Private/redacted events come back with a null title. */
const PRIVATE_EVENT_LABEL = "Busy";

/** Timed events for the day, agenda-ordered, as time-first tooltip lines. */
export function formatMeetingTooltipLines(
  events: readonly MeetingTooltipEvent[]
): MeetingTooltipLine[] {
  return events
    .filter((event) => !event.isAllDay)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
    .map((event, index) => ({
      key: `${event.startMin}-${event.endMin}-${index}`,
      timeLabel: formatHoldSlotLabel(event.startMin, event.endMin),
      title: event.title?.trim() ? event.title : PRIVATE_EVENT_LABEL,
    }));
}
