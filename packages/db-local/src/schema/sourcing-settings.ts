import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow } from "../sqlite-defaults";

/** Mirrors src/db/schema/sourcing-settings.ts (W10). One row per user; jsonb → JSON text. */
export const sourcingSettings = sqliteTable("sourcing_settings", {
  userId: text("user_id").primaryKey(),
  orgId: text("org_id").notNull(),
  segments: text("segments", { mode: "json" }),
  exclusions: text("exclusions", { mode: "json" }),
  weights: text("weights", { mode: "json" }),
  outreachVoice: text("outreach_voice", { mode: "json" }),
  weeklyRunEnabled: integer("weekly_run_enabled", { mode: "boolean" }).notNull().default(false),
  weeklyRunBatchSize: integer("weekly_run_batch_size"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
