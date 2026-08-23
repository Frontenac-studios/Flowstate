import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Collapsed to match Postgres (W1): work vs not-work. */
export const PROJECT_CATEGORIES = ["business", "personal"] as const;

/** Lifecycle state, mirrors the Postgres `project_state` enum. */
export const PROJECT_STATES = ["prospect", "active", "paused", "done"] as const;

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
    /** Who the work is for. Null = internal/personal work. */
    clientId: text("client_id"),
    state: text("state", { enum: PROJECT_STATES })
      .notNull()
      .$defaultFn(() => "active"),
    isMaintenance: integer("is_maintenance", { mode: "boolean" })
      .notNull()
      .$defaultFn(() => false),
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
