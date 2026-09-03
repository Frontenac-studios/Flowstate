import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";

/**
 * The money sidecar for a project — the `financial`-class home for every figure a
 * project attracts before it starts billing (W10f).
 *
 * It exists because of the rule in CLAUDE.md: **money never becomes a column on an
 * existing table.** A proposal amount is money; `projects` and `leads` are both
 * `org_shared`, so a Member's `SELECT *` on either must not be able to surface what
 * a deal was quoted at. The amount lives here instead, and only the owner reads it.
 *
 * One row per project (unique on user+project) — the fee facts are a property of
 * the project, not an event log. `proposalAmountCents` is what you quoted at the
 * Proposal stage; `proposedAt` is when. Both stay null for work that never went
 * through a proposal.
 *
 * **W15 extended this table** rather than adding its own (as W10f promised): the
 * fixed-fee amount and the target-rate floor are the same kind of fact and belong in
 * the same row. `rates` was the alternative home and doesn't fit — a rate requires a
 * `clientId`, and a prospect has no client yet.
 *
 * All money is integer cents, never floats.
 */
export const projectFees = pgTable(
  "project_fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    /** The project this money belongs to. Deleting the project takes the fee with it. */
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** What the deal was quoted at, in cents. Null until a proposal is recorded. */
    proposalAmountCents: integer("proposal_amount_cents"),
    /** When the proposal figure was recorded (not when it was sent — Law 1). */
    proposedAt: timestamp("proposed_at", { withTimezone: true, mode: "date" }),
    /**
     * W15 — the agreed fixed fee, in cents. Only meaningful when the project's
     * `billingType` is `fixed_fee`.
     */
    feeAmountCents: integer("fee_amount_cents"),
    /**
     * The effective hourly rate below which this fixed fee is losing money, in cents
     * (discovery 4.4). Stored rather than derived from the client rate: the floor is
     * a judgement about THIS engagement — what you were willing to accept to win it —
     * and a project can rationally sit below your standard rate and still be worth
     * doing. Deriving it would erase that decision.
     */
    targetRateFloorCents: integer("target_rate_floor_cents"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_fees_user_id_project_id_idx").on(table.userId, table.projectId),
    index("project_fees_project_id_idx").on(table.projectId),
  ]
);
