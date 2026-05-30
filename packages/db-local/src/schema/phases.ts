import { AnySQLiteColumn, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";

export const phases = sqliteTable(
  "phases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentPhaseId: text("parent_phase_id").references((): AnySQLiteColumn => phases.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("phases_user_id_project_id_idx").on(table.userId, table.projectId),
    index("phases_parent_phase_id_idx").on(table.parentPhaseId),
  ]
);
