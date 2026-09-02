import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { directions } from "./directions";
import { projects } from "./projects";
import { leadSource, leadState } from "./sourcing-enums";
import type { LeadRationale } from "@/lib/sourcing/types";

/**
 * A sourced/scored prospect (W10). It is `org_shared` (see src/db/tenancy.ts) — a
 * research artifact about the market, not the person. **Deliberately not a project:**
 * ~5 leads a week are sourced and most are dismissed, so they don't become projects
 * until `promote` (first real contact) creates a `state='prospect'` project and sets
 * `projectId`. This reconciles "a lead is a prospect project" with the churn.
 *
 * MONEY-NEVER-A-COLUMN: no proposal amount / rate figure lives here — the row is
 * `org_shared`. The pipeline's proposal amount lives in `project_fees`
 * (`financial`, keyed by the promoted project), never on this row.
 *
 * `directionId` records which active Direction the lead was scored against, so the
 * Quarter "applied line" can count leads scored/declined per Direction (W10g) — a
 * derived count, the Direction itself stays unmeasured.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    companyName: text("company_name").notNull(),
    /** Soft key into sourcing_settings.segments[].id; not an FK (segments are jsonb). */
    segment: text("segment"),
    source: leadSource("source").notNull().default("manual"),
    /** 0–100 "how good" — null until the brain scores it. Never moved by missing data. */
    score: integer("score"),
    /** 0–100 "how sure" — data coverage; low = thin/unverified. */
    confidence: integer("confidence"),
    rank: integer("rank"),
    /** Fit/Risk/Strategy breakdown + "couldn't confirm" gaps (W10c). */
    rationale: jsonb("rationale").$type<LeadRationale>(),
    state: leadState("state").notNull().default("new"),
    /** One-tap reason captured on dismiss (wrong industry / too small / …). */
    dismissReason: text("dismiss_reason"),
    snoozeUntil: timestamp("snooze_until", { withTimezone: true, mode: "date" }),
    /**
     * When the deal reached a terminal stage (signed / declined / lost). Null while
     * it is open. This is what makes "deals closed this quarter" a read rather than
     * an inference from `updatedAt`, which any later edit would move.
     */
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    /** The weekly agent batch this came from (W10i); no FK until sourcing_runs exists. */
    runId: uuid("run_id"),
    /** Set on promote — the prospect project this lead became. */
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** The active Direction this lead was scored against (powers the applied line). */
    directionId: uuid("direction_id").references(() => directions.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_user_id_state_idx").on(table.userId, table.state),
    index("leads_user_id_rank_idx").on(table.userId, table.rank),
    index("leads_direction_id_idx").on(table.directionId),
  ]
);
