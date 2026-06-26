import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PROJECT_CATEGORIES } from "./projects";

export const protectedBlockTemplates = sqliteTable(
  "protected_block_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    isoWeekday: integer("iso_weekday").notNull(),
    label: text("label"),
    startMin: integer("start_min"),
    endMin: integer("end_min"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("protected_block_templates_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("protected_block_templates_user_id_iso_weekday_idx").on(table.userId, table.isoWeekday),
  ]
);
