import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { calendarConnections } from "./calendar-connections";
import { externalCalendarEventStatus, externalCalendarEventVisibility } from "./calendar-enums";

/** Normalized inbound calendar event from a linked provider (Google). */
export const externalCalendarEvents = pgTable(
  "external_calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    providerEventId: text("provider_event_id").notNull(),
    calendarId: text("calendar_id").notNull(),
    calendarName: text("calendar_name"),
    /** Google calendarList backgroundColor (e.g. #039be5); null when unknown. */
    calendarColor: text("calendar_color"),
    title: text("title"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    isAllDay: boolean("is_all_day").notNull().default(false),
    status: externalCalendarEventStatus("status").notNull().default("confirmed"),
    visibility: externalCalendarEventVisibility("visibility").notNull().default("default"),
    recurrenceMasterId: text("recurrence_master_id"),
    providerUpdatedAt: timestamp("provider_updated_at", { withTimezone: true, mode: "date" }),
    etag: text("etag"),
    htmlLink: text("html_link"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("external_calendar_events_connection_calendar_event_idx").on(
      table.connectionId,
      table.calendarId,
      table.providerEventId
    ),
    index("external_calendar_events_user_id_start_at_idx").on(table.userId, table.startAt),
  ]
);
