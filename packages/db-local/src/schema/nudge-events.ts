import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const nudgeEvents = sqliteTable(
  "nudge_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    localDate: text("local_date").notNull(),
    taskIds: text("task_ids").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("nudge_events_user_id_kind_local_date_idx").on(
      table.userId,
      table.kind,
      table.localDate
    ),
  ]
);
