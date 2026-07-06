import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { taskRecurrence } from "./task-recurrence";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const occurrenceOverrideStatusValues = [
  "completed",
  "skipped",
  "rescheduled",
  "edited",
] as const;

export const taskOccurrenceOverrides = sqliteTable(
  "task_occurrence_overrides",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    recurrenceId: text("recurrence_id")
      .notNull()
      .references(() => taskRecurrence.id, { onDelete: "cascade" }),
    occurrenceDate: text("occurrence_date").notNull(),
    status: text("status", { enum: occurrenceOverrideStatusValues }).notNull(),
    movedToDate: text("moved_to_date"),
    patch: text("patch"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("task_occurrence_overrides_recurrence_date_idx").on(
      table.recurrenceId,
      table.occurrenceDate
    ),
    index("task_occurrence_overrides_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
