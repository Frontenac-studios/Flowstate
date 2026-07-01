import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const DAILY_WIN_SOURCES = ["task", "care_event", "goal", "abyss", "manual"] as const;
export const dailyWinSource = pgEnum("daily_win_source", DAILY_WIN_SOURCES);
export const DAILY_WIN_STATES = ["accepted", "dismissed"] as const;
export const dailyWinState = pgEnum("daily_win_state", DAILY_WIN_STATES);
export const DAILY_WIN_AUTHORS = ["ai", "user"] as const;
export const dailyWinAuthor = pgEnum("daily_win_author", DAILY_WIN_AUTHORS);

export const dailyWins = pgTable(
  "daily_wins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    winDate: date("win_date", { mode: "string" }).notNull(),
    slot: smallint("slot"),
    source: dailyWinSource("source").notNull(),
    refId: uuid("ref_id"),
    label: text("label"),
    state: dailyWinState("state").notNull(),
    author: dailyWinAuthor("author").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("daily_wins_user_id_win_date_idx").on(table.userId, table.winDate),
    index("daily_wins_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    uniqueIndex("daily_wins_user_date_slot_accepted_uidx")
      .on(table.userId, table.winDate, table.slot)
      .where(sql`${table.state} = 'accepted'`),
    uniqueIndex("daily_wins_user_date_ref_dismissed_uidx")
      .on(table.userId, table.winDate, table.refId)
      .where(sql`${table.state} = 'dismissed' AND ${table.refId} IS NOT NULL`),
  ]
);
