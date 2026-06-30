import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ABOUT_ME_AUTHOR, CONSTRAINT_SEVERITY, CONSTRAINT_TYPE } from "./about-me-enums";

// SQLite mirror of user_constraints (§13 V-3). `schedule` is stored as JSON text.
export const userConstraints = sqliteTable(
  "user_constraints",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type", { enum: CONSTRAINT_TYPE }).notNull(),
    label: text("label").notNull(),
    schedule: text("schedule"),
    severity: text("severity", { enum: CONSTRAINT_SEVERITY }).notNull(),
    author: text("author", { enum: ABOUT_ME_AUTHOR }).notNull().default("user"),
    sourceText: text("source_text"),
    learnedAt: integer("learned_at", { mode: "timestamp_ms" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("user_constraints_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
