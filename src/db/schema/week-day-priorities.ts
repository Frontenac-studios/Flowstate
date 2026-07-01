import { date, index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

/** Up to 3 day-scoped priorities per weekday (Week §7 WD1). */
export const weekDayPriorities = pgTable(
  "week_day_priorities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    /** Slot 1–3 within the day (mirrors tasks.top_3_order). */
    priorityOrder: integer("priority_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
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
