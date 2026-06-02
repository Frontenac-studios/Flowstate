import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

/**
 * A scheduled block of time for a task on the day timeline. Distinct from
 * task_time_entries, which record actual time spent — focus_blocks are the plan.
 * startMin/endMin are minutes from local midnight (e.g. 9:00am = 540).
 */
export const focusBlocks = pgTable(
  "focus_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
    status: text("status").notNull().default("planned"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("focus_blocks_user_id_date_idx").on(table.userId, table.date)]
);
