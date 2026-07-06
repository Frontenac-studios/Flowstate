import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const dayReviews = sqliteTable(
  "day_reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    reviewDate: text("date").notNull(),
    summary: text("summary"),
    top3Status: text("top_3_status"),
    reflectionText: text("reflection_text"),
    reflectiveQuestion: text("reflective_question"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [uniqueIndex("day_reviews_user_id_date_idx").on(table.userId, table.reviewDate)]
);
