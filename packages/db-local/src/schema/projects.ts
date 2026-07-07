import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const PROJECT_CATEGORIES = [
  "professional",
  "personal_projects",
  "relationships",
  "body_mind",
  "adulting",
] as const;

export const projects = sqliteTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    // jsonb number[] in Postgres; stored as a JSON string here (see row-mapper).
    embedding: text("embedding"),
    // Soft-archive marker (mirrors Postgres). Non-null hides the project from the
    // index; list queries filter on `isNull(archivedAt)`, so this column must exist
    // or Drizzle emits a dangling `IS NULL` and SQLite errors.
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [uniqueIndex("projects_user_id_slug_idx").on(table.userId, table.slug)]
);
