import { date, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const dayReviews = pgTable(
  "day_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    reviewDate: date("date", { mode: "string" }).notNull(),
    summary: text("summary"),
    top3Status: jsonb("top_3_status"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("day_reviews_user_id_date_idx").on(table.userId, table.reviewDate)]
);
