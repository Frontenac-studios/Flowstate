import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { calendarConnectionStatus, calendarProvider } from "./calendar-enums";

/** OAuth-linked calendar account for inbound Google sync (read-only). */
export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    provider: calendarProvider("provider").notNull(),
    accountEmail: text("account_email").notNull(),
    refreshTokenEnc: text("refresh_token_enc").notNull(),
    accessTokenEnc: text("access_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true, mode: "date" }),
    selectedCalendarIds: jsonb("selected_calendar_ids").$type<string[]>().notNull().default([]),
    syncCursor: text("sync_cursor"),
    status: calendarConnectionStatus("status").notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "date" }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("calendar_connections_user_id_idx").on(table.userId),
    index("calendar_connections_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    uniqueIndex("calendar_connections_user_id_provider_idx").on(table.userId, table.provider),
  ]
);
