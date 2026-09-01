import { pgEnum } from "drizzle-orm/pg-core";

/** Where a lead came from (W10). `sourced` = the agent; the other two are manual/intake. */
export const leadSource = pgEnum("lead_source", ["sourced", "manual", "intake"]);

/**
 * A lead's lifecycle. `new` → the agent/manual entry; `promoted` links it to a
 * `state='prospect'` project (that's when it becomes pipeline); `dismissed`/`snoozed`
 * come from triage. Contacted→engaged→proposal track outreach before promotion.
 */
export const leadState = pgEnum("lead_state", [
  "new",
  "contacted",
  "engaged",
  "proposal",
  "promoted",
  "dismissed",
  "snoozed",
]);

/** An outreach draft is either the first opener or an aging-clock follow-up. */
export const leadOutreachKind = pgEnum("lead_outreach_kind", ["opener", "follow_up"]);

/** A draft you haven't sent, or one you marked sent (copy/open-in-mail; Law 1). */
export const leadOutreachStatus = pgEnum("lead_outreach_status", ["draft", "sent"]);
