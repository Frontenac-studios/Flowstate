import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const nudgeEventKinds = ["top3_stall"] as const;
export type NudgeEventKind = (typeof nudgeEventKinds)[number];

export const nudgeEvents = pgTable(
  "nudge_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    kind: text("kind").notNull().$type<NudgeEventKind>(),
    localDate: date("local_date", { mode: "string" }).notNull(),
    taskIds: jsonb("task_ids").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("nudge_events_user_id_kind_local_date_idx").on(
      table.userId,
      table.kind,
      table.localDate
    ),
    index("nudge_events_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
