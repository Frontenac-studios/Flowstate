import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { PROJECT_CATEGORIES } from "./projects";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const monthIntentions = sqliteTable(
  "month_intentions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    text: text("text").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("month_intentions_user_year_month_category_idx").on(
      table.userId,
      table.year,
      table.month,
      table.category
    ),
    index("month_intentions_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
