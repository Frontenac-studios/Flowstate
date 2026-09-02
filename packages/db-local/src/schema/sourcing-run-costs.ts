import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

/** Mirrors src/db/schema/sourcing-run-costs.ts (W10i). Financial-class, owner-only. */
export const sourcingRunCosts = sqliteTable(
  "sourcing_run_costs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    runId: text("run_id").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    amountMicros: integer("amount_micros").notNull().default(0),
    calls: integer("calls").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("sourcing_run_costs_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("sourcing_run_costs_run_id_idx").on(table.runId),
  ]
);
