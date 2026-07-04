import { index, pgEnum, pgTable, real, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const projectSimilaritySource = pgEnum("project_similarity_source", ["user", "inferred"]);

/**
 * Links a project to a past project it is "like" (§5 P2 / §9.3).
 * User tags and MiniLM-inferred neighbours share this relation; feeds template
 * ranking and duration learning.
 */
export const projectSimilarity = pgTable(
  "project_similarity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id").notNull(),
    similarProjectId: uuid("similar_project_id").notNull(),
    source: projectSimilaritySource("source").notNull(),
    /** Cosine score for inferred links; null for user tags. */
    score: real("score"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
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
