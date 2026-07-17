import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

import { calendarConnections } from "./calendar-connections";

/** Normalized inbound calendar event from a linked provider (Google). */
export const externalCalendarEvents = sqliteTable(
  "external_calendar_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    providerEventId: text("provider_event_id").notNull(),
    calendarId: text("calendar_id").notNull(),
    calendarName: text("calendar_name"),
    /** Google calendarList backgroundColor (e.g. #039be5); null when unknown. */
    calendarColor: text("calendar_color"),
    title: text("title"),
    location: text("location"),
    startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
    isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("confirmed"),
    visibility: text("visibility").notNull().default("default"),
    recurrenceMasterId: text("recurrence_master_id"),
    providerUpdatedAt: integer("provider_updated_at", { mode: "timestamp_ms" }),
    etag: text("etag"),
    htmlLink: text("html_link"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
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
