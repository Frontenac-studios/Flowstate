import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const weekReviews = sqliteTable(
  "week_reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    weekStart: text("week_start").notNull(),
    summary: text("summary"),
    reflectionText: text("reflection_text"),
    payload: text("payload"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [uniqueIndex("week_reviews_user_id_week_start_idx").on(table.userId, table.weekStart)]
);
