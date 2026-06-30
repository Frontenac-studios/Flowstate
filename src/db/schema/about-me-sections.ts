import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { aboutMeSection } from "./about-me-enums";

// §13 V-2: the free-prose body for a headed section of the About-me doc. One row per
// (user, section). Primarily used by Work and Life; Values and Constraints carry their
// structured content in their own tables, with an optional prose intro here. Edits are
// future-only by contract (§13 V2-3) — saving a body never recomputes past plans.
export const aboutMeSections = pgTable(
  "about_me_sections",
  {
    userId: uuid("user_id").notNull(),
    section: aboutMeSection("section").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.section] })]
);
