import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { VALUE_SOURCE } from "./about-me-enums";

// SQLite mirror of user_values (§13 V-1).
export const userValues = sqliteTable(
  "user_values",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    label: text("label").notNull(),
    source: text("source", { enum: VALUE_SOURCE }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("user_values_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
