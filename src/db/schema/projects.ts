import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projectCategory = pgEnum("project_category", [
  "professional",
  "personal_projects",
  "relationships",
  "body_mind",
  "adulting",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: projectCategory("category").notNull(),
    /**
     * MiniLM name embedding (384-float unit vector) for project similarity (§5 P2).
     * Computed client-side (Backlog seam); server only stores and ranks.
     */
    embedding: jsonb("embedding").$type<number[]>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("projects_user_id_slug_idx").on(table.userId, table.slug),
    index("projects_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
