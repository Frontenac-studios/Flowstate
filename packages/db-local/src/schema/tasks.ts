import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    priority: integer("priority").notNull().default(0),
    scheduledDate: text("scheduled_date"),
    bucketOverride: text("bucket_override"),
    isTop3: integer("is_top_3", { mode: "boolean" }).notNull().default(false),
    top3Order: integer("top_3_order"),
    top3PinnedAt: integer("top_3_pinned_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("tasks_user_id_scheduled_date_idx").on(table.userId, table.scheduledDate)]
);
