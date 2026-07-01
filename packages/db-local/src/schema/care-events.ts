import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { careActivities } from "./care-activities";

// SQLite mirror of the Postgres care_events.
export const careEvents = sqliteTable(
  "care_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    activityId: text("activity_id").references(() => careActivities.id, { onDelete: "set null" }),
    source: text("source").notNull().default("practice"),
    meta: text("meta"),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    durationMinutes: integer("duration_minutes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("care_events_user_id_occurred_at_idx").on(table.userId, table.occurredAt),
    index("care_events_activity_id_idx").on(table.activityId),
  ]
);
