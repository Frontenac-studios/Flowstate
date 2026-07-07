import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const projectMilestones = sqliteTable(
  "project_milestones",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetDate: text("target_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("project_milestones_user_id_project_id_idx").on(table.userId, table.projectId),
    index("project_milestones_user_id_target_date_idx").on(table.userId, table.targetDate),
  ]
);
