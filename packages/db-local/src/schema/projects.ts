import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const PROJECT_CATEGORIES = [
  "professional",
  "personal_projects",
  "relationships",
  "health_wellness",
  "adulting",
] as const;

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("projects_user_id_slug_idx").on(table.userId, table.slug)]
);
