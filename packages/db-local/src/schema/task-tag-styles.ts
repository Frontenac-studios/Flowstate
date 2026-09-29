import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Desktop mirror of src/db/schema/task-tag-styles.ts. */
export const taskTagStyles = sqliteTable(
  "task_tag_styles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    kind: text("kind"),
    color: text("color"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("task_tag_styles_user_id_name_key_idx").on(table.userId, table.nameKey),
    index("task_tag_styles_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
