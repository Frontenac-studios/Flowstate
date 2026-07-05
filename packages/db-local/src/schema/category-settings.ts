import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PROJECT_CATEGORIES } from "./projects";
import { sqliteNow } from "../sqlite-defaults";

// SQLite mirror of category_settings (one row per category per user).
export const categorySettings = sqliteTable(
  "category_settings",
  {
    userId: text("user_id").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    label: text("label"),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    weeklyTarget: integer("weekly_target"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.category] })]
);
