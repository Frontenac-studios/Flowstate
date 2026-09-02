import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { sourcingRuns } from "./sourcing-runs";

/**
 * What the sourcing agent actually spent (W10i), in integer cents.
 *
 * `financial`-class, and a separate table from `sourcing_runs` for the reason
 * CLAUDE.md gives: money never becomes a column on an existing table. A run's counts
 * are work facts a Member could see; what it cost is not. The same split as
 * `leads` / `project_fees`.
 *
 * The figures are REAL, not estimated — OpenRouter returns the charge for each call
 * in its response metadata, and that is what is recorded. This table is therefore
 * also the ledger the 30-day spend ceiling is enforced against: a runaway cron cannot
 * outspend a ceiling that is checked against what was genuinely billed.
 */
export const sourcingRunCosts = pgTable(
  "sourcing_run_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    /** The run this spend belongs to. A deleted run takes its costs with it. */
    runId: uuid("run_id")
      .notNull()
      .references(() => sourcingRuns.id, { onDelete: "cascade" }),
    /** Billed amount in integer cents (sub-cent calls accumulate as micros below). */
    amountCents: integer("amount_cents").notNull().default(0),
    /**
     * The same charge in millionths of a cent. A single research call costs about
     * four cents, but a scoring call can be a fraction of one — rounding each to a
     * whole cent would either erase the small ones or inflate the total, and the
     * ceiling would drift away from the real bill either way.
     */
    amountMicros: integer("amount_micros").notNull().default(0),
    /** How many model calls this row accounts for. */
    calls: integer("calls").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("sourcing_run_costs_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("sourcing_run_costs_run_id_idx").on(table.runId),
  ]
);
