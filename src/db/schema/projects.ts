import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("projects_user_id_slug_idx").on(table.userId, table.slug)]
);
