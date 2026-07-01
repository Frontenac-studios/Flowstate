import { index, integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { careActivities } from "./care-activities";
import { careEventSource } from "./care-enums";

export type CareEventBingoMeta = {
  cardYear: number;
  lineType: "row" | "column" | "diagonal";
};

export type CareEventBreathingMeta = {
  preset: "box4" | "relax4-6";
  cycles: number;
};

export type CareEventDailyWinMeta = {
  dailyWinId: string;
  winDate: string;
  beat: "drip" | "full_set";
};

export type CareEventMeta =
  | CareEventBingoMeta
  | CareEventDailyWinMeta
  | CareEventBreathingMeta
  | null;

// A logged self-care act ("I did this" / check-off) or a planning bingo nourish.
// Feeds frequency stats, garden nourishment, and wins. activityId is nullable +
// set-null so an event outlives its practice being archived/removed;
// durationMinutes is forward-compat (walk length, etc.) and unused in this slice.
export const careEvents = pgTable(
  "care_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    activityId: uuid("activity_id").references(() => careActivities.id, {
      onDelete: "set null",
    }),
    source: careEventSource("source").notNull().default("practice"),
    meta: jsonb("meta").$type<CareEventMeta>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    durationMinutes: integer("duration_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("care_events_user_id_occurred_at_idx").on(table.userId, table.occurredAt),
    index("care_events_activity_id_idx").on(table.activityId),
  ]
);
