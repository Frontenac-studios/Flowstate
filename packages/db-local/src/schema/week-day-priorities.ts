import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { tasks } from "./tasks";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const weekDayPriorities = sqliteTable(
  "week_day_priorities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    scheduledDate: text("scheduled_date").notNull(),
    priorityOrder: integer("priority_order").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("week_day_priorities_user_id_scheduled_date_idx").on(table.userId, table.scheduledDate),
    index("week_day_priorities_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    uniqueIndex("week_day_priorities_user_date_slot_uidx").on(
      table.userId,
      table.scheduledDate,
      table.priorityOrder
    ),
    uniqueIndex("week_day_priorities_user_task_date_uidx").on(
      table.userId,
      table.taskId,
      table.scheduledDate
    ),
  ]
);
