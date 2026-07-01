import {
  date,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { reflectionScope } from "./care-enums";

export const careReflections = pgTable(
  "care_reflections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    reflectionDate: date("reflection_date", { mode: "string" }).notNull(),
    scope: reflectionScope("scope").notNull().default("daily"),
    promptText: text("prompt_text").notNull(),
    bodyText: text("body_text"),
    mood: smallint("mood"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("care_reflections_user_date_scope_idx").on(
      table.userId,
      table.reflectionDate,
      table.scope
    ),
    index("care_reflections_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
