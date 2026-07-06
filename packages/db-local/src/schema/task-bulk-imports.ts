import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";
import { tasks } from "./tasks";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const taskBulkImports = sqliteTable(
  "task_bulk_imports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskCount: integer("task_count").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    undoneAt: integer("undone_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("task_bulk_imports_user_id_project_id_created_at_idx").on(
      table.userId,
      table.projectId,
      table.createdAt
    ),
  ]
);

export const taskBulkImportItems = sqliteTable(
  "task_bulk_import_items",
  {
    importId: text("import_id")
      .notNull()
      .references(() => taskBulkImports.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    primaryKey({ columns: [table.importId, table.taskId] }),
    index("task_bulk_import_items_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
