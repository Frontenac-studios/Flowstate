import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** How a run was started: the Tuesday cron, or the "Source now" button. */
export const sourcingRunTrigger = pgEnum("sourcing_run_trigger", ["cron", "manual"]);

/**
 * A batch of the weekly sourcing agent's work (W10i). One row per run; a run is
 * created, then advanced across SEVERAL invocations until its queue is empty.
 *
 * It has to be resumable because a single company's research takes 50–75 seconds
 * against a 300-second function ceiling — so a batch of five cannot finish in one
 * pass, and pretending otherwise would mean a run that dies half-done with no record
 * of where it got to. The row IS that record: `discovered` names the work, `processed`
 * how far the agent has got, and a worker picks up whatever is unfinished.
 *
 * `org_shared` (see src/db/tenancy.ts): it describes work on the market, not money.
 * What the run COST is money and lives in `sourcing_run_costs` (financial-class) —
 * the same split as leads vs project_fees.
 */
export const sourcingRunStatus = pgEnum("sourcing_run_status", [
  "discovering",
  "researching",
  "complete",
  "failed",
]);

export const sourcingRuns = pgTable(
  "sourcing_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    trigger: sourcingRunTrigger("trigger").notNull().default("cron"),
    status: sourcingRunStatus("status").notNull().default("discovering"),
    /**
     * ISO week key ("2026-W36") the run belongs to. Unique per user per week for a
     * cron run — this is what stops an hourly worker from starting a second Tuesday
     * batch every hour it wakes up.
     */
    weekKey: text("week_key").notNull(),
    /** How many prospects this run was asked to find (the per-run cap). */
    batchSize: integer("batch_size").notNull(),
    /** How many candidate companies discovery actually returned, after dedup. */
    discovered: integer("discovered").notNull().default(0),
    /** How many have been researched and scored so far — the resume cursor. */
    processed: integer("processed").notNull().default(0),
    /** Set when the run stops for good, successfully or not. */
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    /** Why it failed, when it did. Null on a healthy run. */
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("sourcing_runs_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("sourcing_runs_user_id_status_idx").on(table.userId, table.status),
    index("sourcing_runs_user_id_week_key_idx").on(table.userId, table.weekKey),
  ]
);
