import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const dailyWins = sqliteTable(
  "daily_wins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    winDate: text("win_date").notNull(),
    slot: integer("slot"),
    source: text("source").notNull(),
    refId: text("ref_id"),
    label: text("label"),
    state: text("state").notNull(),
    author: text("author").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("daily_wins_user_date_slot_accepted_uidx").on(
      table.userId,
      table.winDate,
      table.slot
    ),
    uniqueIndex("daily_wins_user_date_ref_dismissed_uidx").on(
      table.userId,
      table.winDate,
      table.refId
    ),
  ]
);
