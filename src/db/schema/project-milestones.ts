import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";

/**
 * Project-level dated markers surfaced on the project calendar / board header and
 * authored in the setup wizard. Parallels `goal_milestones`, but scoped to a project.
 */
export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetDate: date("target_date", { mode: "string" }),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("project_milestones_user_id_project_id_idx").on(table.userId, table.projectId),
    index("project_milestones_user_id_target_date_idx").on(table.userId, table.targetDate),
  ]
);
