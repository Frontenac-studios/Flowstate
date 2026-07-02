import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const evidenceEditions = sqliteTable("evidence_editions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  refId: text("ref_id"),
  narrative: text("narrative").notNull().default("{}"),
  state: text("state").notNull().default("unseen"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
