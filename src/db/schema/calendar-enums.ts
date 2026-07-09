import { pgEnum } from "drizzle-orm/pg-core";

/** Inbound calendar provider (Google only for now). */
export const CALENDAR_PROVIDERS = ["google"] as const;
export const calendarProvider = pgEnum("calendar_provider", CALENDAR_PROVIDERS);

/** OAuth connection lifecycle for a user's linked calendar account. */
export const CALENDAR_CONNECTION_STATUSES = ["active", "error", "disconnected"] as const;
export const calendarConnectionStatus = pgEnum(
  "calendar_connection_status",
  CALENDAR_CONNECTION_STATUSES
);

/** Google Calendar event response status. */
export const EXTERNAL_CALENDAR_EVENT_STATUSES = ["confirmed", "tentative", "cancelled"] as const;
export const externalCalendarEventStatus = pgEnum(
  "external_calendar_event_status",
  EXTERNAL_CALENDAR_EVENT_STATUSES
);

/** Google Calendar visibility; `default` follows calendar-level settings. */
export const EXTERNAL_CALENDAR_EVENT_VISIBILITIES = ["public", "private", "default"] as const;
export const externalCalendarEventVisibility = pgEnum(
  "external_calendar_event_visibility",
  EXTERNAL_CALENDAR_EVENT_VISIBILITIES
);
