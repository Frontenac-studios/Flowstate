import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PROJECT_CATEGORIES } from "./projects";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** SQLite mirror of project_templates. `structure` is stored as JSON text. */
export const projectTemplates = sqliteTable(
  "project_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    structure: text("structure").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("project_templates_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("project_templates_user_id_name_idx").on(table.userId, table.name),
  ]
);
