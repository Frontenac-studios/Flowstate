import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PROJECT_CATEGORIES } from "./projects";

export const appSettings = sqliteTable("app_settings", {
  userId: text("user_id").primaryKey(),
  bucketMode: text("bucket_mode").notNull().default("relative"),
  dayStartHour: integer("day_start_hour").notNull().default(7),
  dayEndHour: integer("day_end_hour").notNull().default(19),
  lastUsedCategory: text("last_used_category", { enum: PROJECT_CATEGORIES }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
