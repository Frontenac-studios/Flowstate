import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const appSettings = pgTable("app_settings", {
  userId: uuid("user_id").primaryKey(),
  bucketMode: text("bucket_mode").notNull().default("relative"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
