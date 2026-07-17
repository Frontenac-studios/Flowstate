import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** OAuth-linked calendar account for inbound Google sync (read-only). */
export const calendarConnections = sqliteTable(
  "calendar_connections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    accountEmail: text("account_email").notNull(),
    refreshTokenEnc: text("refresh_token_enc").notNull(),
    accessTokenEnc: text("access_token_enc"),
    tokenExpiresAt: integer("token_expires_at", { mode: "timestamp_ms" }),
    selectedCalendarIds: text("selected_calendar_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    syncCursor: text("sync_cursor"),
    status: text("status").notNull().default("active"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("calendar_connections_user_id_idx").on(table.userId),
    index("calendar_connections_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    uniqueIndex("calendar_connections_user_id_provider_idx").on(table.userId, table.provider),
  ]
);
