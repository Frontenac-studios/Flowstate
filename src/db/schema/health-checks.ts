import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const healthChecks = pgTable("health_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  service: text("service").notNull(),
  status: text("status").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
