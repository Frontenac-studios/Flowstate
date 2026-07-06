import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const PROJECT_SIMILARITY_SOURCES = ["user", "inferred"] as const;

/** SQLite mirror of project_similarity (§5 P2). */
export const projectSimilarity = sqliteTable(
  "project_similarity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    projectId: text("project_id").notNull(),
    similarProjectId: text("similar_project_id").notNull(),
    source: text("source", { enum: PROJECT_SIMILARITY_SOURCES }).notNull(),
    score: real("score"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("project_similarity_project_similar_uidx").on(
      table.userId,
      table.projectId,
      table.similarProjectId
    ),
    index("project_similarity_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("project_similarity_user_id_project_id_idx").on(table.userId, table.projectId),
  ]
);
