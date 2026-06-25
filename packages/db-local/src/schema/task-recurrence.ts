import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";

export const taskRecurrence = sqliteTable(
  "task_recurrence",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    rrule: text("rrule").notNull(),
    startDate: text("start_date").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("task_recurrence_task_id_idx").on(table.taskId),
    index("task_recurrence_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
