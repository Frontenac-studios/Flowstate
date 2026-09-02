import { pgEnum } from "drizzle-orm/pg-core";

/** Where a lead came from (W10). `sourced` = the agent; the other two are manual/intake. */
export const leadSource = pgEnum("lead_source", ["sourced", "manual", "intake"]);

/**
 * A lead's lifecycle — and, from W10f, its **pipeline stage**. The five open stages
 * `new`(Sourced) → `contacted` → `engaged` → `proposal` → `signed` are the funnel;
 * the ordering lives in src/lib/sourcing/pipeline.ts, which is the single authority
 * on what "forward" means.
 *
 * Promotion is no longer a state: a lead that reaches `contacted` or beyond gets a
 * `state='prospect'` project and carries its id in `projectId` (that boolean is the
 * fact, so it can't drift out of step with the stage). `promoted` is retained only
 * because Postgres cannot drop an enum value — migration 0059 moved every existing
 * `promoted` row to `contacted`, and nothing writes it any more.
 *
 * Three terminal states close a deal, and the state IS the close reason: `signed`
 * (won), `declined` (they said no), `lost` (went dark / lost it). `dismissed` and
 * `snoozed` stay distinct — those are triage verbs, used before the deal was ever
 * real, and carry `dismissReason` instead.
 */
export const leadState = pgEnum("lead_state", [
  "new",
  "contacted",
  "engaged",
  "proposal",
  "signed",
  "promoted",
  "dismissed",
  "snoozed",
  "declined",
  "lost",
]);

/** An outreach draft is either the first opener or an aging-clock follow-up. */
export const leadOutreachKind = pgEnum("lead_outreach_kind", ["opener", "follow_up"]);

/** A draft you haven't sent, or one you marked sent (copy/open-in-mail; Law 1). */
export const leadOutreachStatus = pgEnum("lead_outreach_status", ["draft", "sent"]);
