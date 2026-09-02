import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/sourcing-runs.ts (W10i). */
export const SOURCING_RUN_TRIGGERS = ["cron", "manual"] as const;
export const SOURCING_RUN_STATUSES = ["discovering", "researching", "complete", "failed"] as const;

export const sourcingRuns = sqliteTable(
  "sourcing_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    trigger: text("trigger", { enum: SOURCING_RUN_TRIGGERS })
      .notNull()
      .$defaultFn(() => "cron"),
    status: text("status", { enum: SOURCING_RUN_STATUSES })
      .notNull()
      .$defaultFn(() => "discovering"),
    weekKey: text("week_key").notNull(),
    batchSize: integer("batch_size").notNull(),
    discovered: integer("discovered").notNull().default(0),
    processed: integer("processed").notNull().default(0),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("sourcing_runs_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("sourcing_runs_user_id_week_key_idx").on(table.userId, table.weekKey),
  ]
);
