import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const dayReviews = sqliteTable(
  "day_reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    reviewDate: text("date").notNull(),
    summary: text("summary"),
    top3Status: text("top_3_status"),
    reflectionText: text("reflection_text"),
    reflectiveQuestion: text("reflective_question"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("day_reviews_user_id_date_idx").on(table.userId, table.reviewDate)]
);
