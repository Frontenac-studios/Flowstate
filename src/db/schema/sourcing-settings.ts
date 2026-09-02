import { boolean, integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import type { OutreachVoice, SourcingSegment, SourcingWeights } from "@/lib/sourcing/types";

/**
 * ICP + outreach-voice config for the sourcing agent (W10). One row per user. It is
 * `org_shared` (see src/db/tenancy.ts): the ICP describes the *work/market*, not the
 * person, so it follows the `money_settings` "own dedicated table" discipline but
 * classified org_shared like `directions`/`targets` — never `app_settings` (that's
 * `personal`; a Partner would never see the ICP). All jsonb, null until configured;
 * the ICP is auto-seeded from Direction + won-clients + Targets + rate (W10b).
 */
export const sourcingSettings = pgTable("sourcing_settings", {
  userId: uuid("user_id").primaryKey(),
  orgId: uuid("org_id").notNull(),
  /** 2–3 ICP profiles. */
  segments: jsonb("segments").$type<SourcingSegment[]>(),
  /** Free-form exclusion rules (industries, sizes, do-not-contact patterns). */
  exclusions: jsonb("exclusions").$type<string[]>(),
  /** Score weighting (won-similarity vs explicit; Fit/Risk/Strategy split). */
  weights: jsonb("weights").$type<SourcingWeights>(),
  outreachVoice: jsonb("outreach_voice").$type<OutreachVoice>(),
  /**
   * The weekly run is OPT-IN and defaults off (W10i). It spends real money on model
   * calls, unattended, on a schedule — so it does not start because a branch merged;
   * it starts because someone switched it on.
   */
  weeklyRunEnabled: boolean("weekly_run_enabled").notNull().default(false),
  /** Prospects per run, clamped to the plan's 3–10 band. Null = the default of 5. */
  weeklyRunBatchSize: integer("weekly_run_batch_size"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
