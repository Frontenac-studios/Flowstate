import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { aboutMeAuthor, constraintSeverity, constraintType } from "./about-me-enums";

// §13 V-3: structured constraint rows — working hours, recurring commitments, and
// preferences (V3-1), each hard or soft (V3-2). `schedule` holds the structured
// days/time spec as jsonb so scheduling + DND can consume it later without reparsing.
// Rows may be user-authored or AI-proposed (V2-2); AI rows always carry provenance
// (`sourceText` / `learnedAt`, V2-4). Table is `user_constraints` to avoid the
// reserved-word risk around `constraints`.
export const userConstraints = pgTable(
  "user_constraints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: constraintType("type").notNull(),
    label: text("label").notNull(),
    // { days: number[] (1=Mon..7=Sun), startMin?: number, endMin?: number } — null for
    // preferences with no time window. Shape validated app-layer (src/lib/about-me).
    schedule: jsonb("schedule"),
    severity: constraintSeverity("severity").notNull(),
    author: aboutMeAuthor("author").notNull().default("user"),
    // Provenance — set only for AI-authored rows (V2-4).
    sourceText: text("source_text"),
    learnedAt: timestamp("learned_at", { withTimezone: true, mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("user_constraints_user_id_updated_at_idx").on(table.userId, table.updatedAt)]
);
