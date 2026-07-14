import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const weekReviews = pgTable(
  "week_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    summary: text("summary"),
    reflectionText: text("reflection_text"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("week_reviews_user_id_week_start_idx").on(table.userId, table.weekStart),
    index("week_reviews_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
