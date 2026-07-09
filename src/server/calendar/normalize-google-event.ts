import "server-only";

import type { calendar_v3 } from "googleapis";

import type {
  externalCalendarEventStatus,
  externalCalendarEventVisibility,
} from "@/db/schema/calendar-enums";

type EventStatus = (typeof externalCalendarEventStatus.enumValues)[number];
type EventVisibility = (typeof externalCalendarEventVisibility.enumValues)[number];

export type NormalizedGoogleEventRow = {
  providerEventId: string;
  calendarId: string;
  calendarName: string | null;
  title: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  status: EventStatus;
  visibility: EventVisibility;
  recurrenceMasterId: string | null;
  providerUpdatedAt: Date | null;
  etag: string | null;
  htmlLink: string | null;
};

export type NormalizeGoogleEventResult =
  | { action: "upsert"; row: NormalizedGoogleEventRow }
  | { action: "delete"; providerEventId: string }
  | { action: "skip" };

function mapStatus(status: string | null | undefined): EventStatus {
  if (status === "tentative" || status === "cancelled") return status;
  return "confirmed";
}

function mapVisibility(visibility: string | null | undefined): EventVisibility {
  if (visibility === "private" || visibility === "confidential") return "private";
  if (visibility === "public") return "public";
  return "default";
}

function parseEventTimes(
  event: calendar_v3.Schema$Event
): { startAt: Date; endAt: Date; isAllDay: boolean } | null {
  const start = event.start;
  const end = event.end;
  if (!start || !end) return null;

  if (start.date && end.date) {
    return {
      startAt: new Date(`${start.date}T00:00:00.000Z`),
      endAt: new Date(`${end.date}T00:00:00.000Z`),
      isAllDay: true,
    };
  }

  if (start.dateTime && end.dateTime) {
    return {
      startAt: new Date(start.dateTime),
      endAt: new Date(end.dateTime),
      isAllDay: false,
    };
  }

  return null;
}

/** Map a Google Calendar API event to an upsert/delete/skip action for `external_calendar_events`. */
export function normalizeGoogleEvent(
  event: calendar_v3.Schema$Event,
  calendarId: string,
  calendarName?: string | null
): NormalizeGoogleEventResult {
  if (!event.id) return { action: "skip" };

  const selfAttendee = event.attendees?.find((attendee) => attendee.self);
  if (selfAttendee?.responseStatus === "declined") {
    return { action: "delete", providerEventId: event.id };
  }

  if (event.status === "cancelled") {
    return { action: "delete", providerEventId: event.id };
  }

  const times = parseEventTimes(event);
  if (!times) return { action: "skip" };

  return {
    action: "upsert",
    row: {
      providerEventId: event.id,
      calendarId,
      calendarName: calendarName ?? null,
      title: event.summary ?? null,
      location: event.location ?? null,
      startAt: times.startAt,
      endAt: times.endAt,
      isAllDay: times.isAllDay,
      status: mapStatus(event.status),
      visibility: mapVisibility(event.visibility),
      recurrenceMasterId: event.recurringEventId ?? null,
      providerUpdatedAt: event.updated ? new Date(event.updated) : null,
      etag: event.etag ?? null,
      htmlLink: event.htmlLink ?? null,
    },
  };
}
