import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { aboutMeSection, aboutMeSuggestionStatus } from "./about-me-enums";

// §13 V2-2: AI-proposed additions to the About-me doc, shown as ghosted suggestions the
// user accepts/rejects (reuses the §9 ghosted-accept lifecycle). The `payload` describes
// the proposed addition, shaped by `targetSection`:
//   values      → { label }
//   work | life → { text }
//   constraints → { type, label, schedule?, severity }
// Provenance (`sourceText` / `learnedAt`, V2-4) renders inline as "learned from … , Aug".
// This section owns the table; §11 (AI persona) is the producer (propose_about_me_edit).
export const aboutMeSuggestions = pgTable(
  "about_me_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    targetSection: aboutMeSection("target_section").notNull(),
    payload: jsonb("payload").notNull(),
    sourceText: text("source_text"),
    learnedAt: timestamp("learned_at", { withTimezone: true, mode: "date" }),
    status: aboutMeSuggestionStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("about_me_suggestions_user_target_status_idx").on(
      table.userId,
      table.targetSection,
      table.status
    ),
    index("about_me_suggestions_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
