import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ABOUT_ME_SECTION } from "./about-me-enums";
import { sqliteNow } from "../sqlite-defaults";

// SQLite mirror of about_me_sections (§13 V-2) — one prose body per (user, section).
export const aboutMeSections = sqliteTable(
  "about_me_sections",
  {
    userId: text("user_id").notNull(),
    section: text("section", { enum: ABOUT_ME_SECTION }).notNull(),
    body: text("body").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.section] })]
);
