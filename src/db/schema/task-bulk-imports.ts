import { index, integer, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { tasks } from "./tasks";

export const taskBulkImports = pgTable(
  "task_bulk_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskCount: integer("task_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    undoneAt: timestamp("undone_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("task_bulk_imports_user_id_project_id_created_at_idx").on(
      table.userId,
      table.projectId,
      table.createdAt
    ),
    index("task_bulk_imports_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);

export const taskBulkImportItems = pgTable(
  "task_bulk_import_items",
  {
    importId: uuid("import_id")
      .notNull()
      .references(() => taskBulkImports.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.importId, table.taskId] }),
    index("task_bulk_import_items_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
