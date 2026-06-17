import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projectCategory } from "./projects";

export const appSettings = pgTable("app_settings", {
  userId: uuid("user_id").primaryKey(),
  bucketMode: text("bucket_mode").notNull().default("relative"),
  dayStartHour: integer("day_start_hour").notNull().default(7),
  dayEndHour: integer("day_end_hour").notNull().default(19),
  // Phase 1 (1.4 habit layer): the category the resolver last landed on, used as
  // the default for loose tasks. Nullable until the user's first resolved create.
  lastUsedCategory: projectCategory("last_used_category"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
