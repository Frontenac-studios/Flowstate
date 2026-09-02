import { and, asc, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import {
  syncLeadOutreachRow,
  syncLeadRow,
  syncProjectFeeRow,
  syncSourcingRunRow,
  syncSourcingSettingsRow,
} from "@/db/record-sync-mutation";
import {
  clients,
  directions,
  leadOutreach,
  leads,
  projectFees,
  rates,
  sourcingRunCosts,
  sourcingRuns,
  sourcingSettings,
  targets,
} from "@/db/tables";
import { isModelConfigured } from "@/lib/env";
import { DEFAULT_VOICE, DEFAULT_WEIGHTS } from "@/lib/sourcing/constants";
import {
  CLOSED_STAGES,
  OPEN_STAGES,
  PIPELINE_STAGES,
  isClosedStage,
  stagePromotes,
  stageTakesProposal,
  type PipelineStage,
} from "@/lib/sourcing/pipeline";
import { segmentConfidenceHealth } from "@/lib/sourcing/enrichment";
import { renderFactsForScoring } from "@/lib/sourcing/research";
import {
  ageInDays,
  checkBudget,
  clampBatchSize,
  isoWeekKey,
  monthlyCeilingCents,
  spendToCents,
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
} from "@/lib/sourcing/run";
import { rankLeads } from "@/lib/sourcing/scoring";
import { buildIcpSeed } from "@/lib/sourcing/seed";
import { draftOutreach } from "@/server/sourcing/draft-outreach";
import {
  archiveProject,
  ensureProspectProject,
  signProject,
  unarchiveProject,
  unsignProject,
} from "@/server/sourcing/pipeline-effects";
import { enrichLead } from "@/server/sourcing/enrich-lead";
import { researchCompany } from "@/server/sourcing/research-company";
import { scoreCompany } from "@/server/sourcing/score-company";
import { isWebResearchConfigured } from "@/server/sourcing/web-research";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * The board shows open deals only. The stage vocabulary itself lives in
 * src/lib/sourcing/pipeline.ts — this router never hard-codes the funnel.
 */
const BOARD_STATES = OPEN_STAGES;

/** Every stage a deal can be moved to by hand: the funnel, plus the two losses. */
const SETTABLE_STAGES = [...PIPELINE_STAGES, "declined", "lost"] as const;

/** One-tap dismiss reasons (walk-through: bad-timing snoozes rather than excludes). */
const DISMISS_REASONS = [
  "wrong_industry",
  "too_small",
  "too_big",
  "bad_timing",
  "already_know",
  "not_interested",
] as const;

/** Opener + this many aging-clock follow-ups per draft run. */
const FOLLOW_UP_COUNT = 2;

const segmentSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  firmographics: z.string().trim().max(2000),
  /** W10j gap-filling for this segment. Absent = off, which costs nothing. */
  enrichment: z.enum(["off", "web"]).optional(),
});

const weightsSchema = z.object({
  wonSimilarity: z.number().int().min(0).max(100),
  explicit: z.number().int().min(0).max(100),
  fit: z.number().int().min(0).max(100),
  risk: z.number().int().min(0).max(100),
  strategy: z.number().int().min(0).max(100),
});

const voiceSchema = z.object({
  warmth: z.enum(["warm", "professional", "formal"]),
  length: z.enum(["short", "medium"]),
  signature: z.string().trim().max(500),
  citeAnalogousClient: z.boolean(),
  voiceSample: z.string().trim().max(4000),
});

/**
 * ICP + outreach-voice config for the sourcing agent (W10b). The scoring brain
 * (W10c) reads these settings; here we just read/write them and offer an auto-seed
 * drawn from the user's own Directions, won clients, Targets, and rate.
 */
export const sourcingRouter = createTRPCRouter({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select()
      .from(sourcingSettings)
      .where(eq(sourcingSettings.userId, ctx.userId))
      .limit(1);
    return {
      segments: row?.segments ?? null,
      exclusions: row?.exclusions ?? null,
      weights: row?.weights ?? null,
      outreachVoice: row?.outreachVoice ?? null,
      weeklyRunEnabled: row?.weeklyRunEnabled ?? false,
      weeklyRunBatchSize: clampBatchSize(row?.weeklyRunBatchSize),
      configured: row != null && row.segments != null,
    };
  }),

  /** A starter ICP built from what the app already knows — the UI prefills with it. */
  getSeedSuggestion: protectedProcedure.query(async ({ ctx }) => {
    const [directionRows, clientRows, targetRows, rateRows] = await Promise.all([
      db
        .select({ statement: directions.statement })
        .from(directions)
        .where(and(eq(directions.userId, ctx.userId), isNull(directions.retiredAt))),
      db.select({ name: clients.name }).from(clients).where(eq(clients.userId, ctx.userId)),
      db
        .select({ title: targets.title, state: targets.state })
        .from(targets)
        .where(eq(targets.userId, ctx.userId)),
      db.select({ amountCents: rates.amountCents }).from(rates).where(eq(rates.userId, ctx.userId)),
    ]);

    const rateFloorCents = rateRows.length ? Math.min(...rateRows.map((r) => r.amountCents)) : null;

    return buildIcpSeed({
      directions: directionRows.map((d) => d.statement),
      wonClientNames: clientRows.map((c) => c.name),
      targetTitles: targetRows.filter((t) => t.state === "active").map((t) => t.title),
      rateFloorCents,
    });
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        segments: z.array(segmentSchema).max(3).optional(),
        exclusions: z.array(z.string().trim().max(200)).max(50).optional(),
        weights: weightsSchema.optional(),
        outreachVoice: voiceSchema.optional(),
        weeklyRunEnabled: z.boolean().optional(),
        weeklyRunBatchSize: z.number().int().min(MIN_BATCH_SIZE).max(MAX_BATCH_SIZE).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Partial<typeof sourcingSettings.$inferInsert> = { updatedAt: new Date() };
      if (input.segments !== undefined) patch.segments = input.segments;
      if (input.exclusions !== undefined) patch.exclusions = input.exclusions;
      if (input.weights !== undefined) patch.weights = input.weights;
      if (input.outreachVoice !== undefined) patch.outreachVoice = input.outreachVoice;
      if (input.weeklyRunEnabled !== undefined) patch.weeklyRunEnabled = input.weeklyRunEnabled;
      if (input.weeklyRunBatchSize !== undefined) {
        patch.weeklyRunBatchSize = clampBatchSize(input.weeklyRunBatchSize);
      }

      const [existing] = await db
        .select({ userId: sourcingSettings.userId })
        .from(sourcingSettings)
        .where(eq(sourcingSettings.userId, ctx.userId))
        .limit(1);

      let row;
      if (existing) {
        [row] = await db
          .update(sourcingSettings)
          .set(patch)
          .where(eq(sourcingSettings.userId, ctx.userId))
          .returning();
      } else {
        [row] = await db
          .insert(sourcingSettings)
          .values({ userId: ctx.userId, orgId: ctx.orgId, ...patch })
          .returning();
      }
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save sourcing settings.",
        });
      }

      await syncSourcingSettingsRow(ctx.userId, existing ? "update" : "insert", row);
      return row;
    }),

  /** Add a prospect by hand (web-sourced batch is W10i). Links the active Direction. */
  addLead: protectedProcedure
    .input(
      z.object({
        companyName: z.string().trim().min(1).max(200),
        notes: z.string().trim().max(4000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Dedup: don't re-surface a company already a lead or a client (case-insensitive).
      const key = input.companyName.trim().toLowerCase();
      const [existingLeads, existingClients] = await Promise.all([
        db.select({ name: leads.companyName }).from(leads).where(eq(leads.userId, ctx.userId)),
        db.select({ name: clients.name }).from(clients).where(eq(clients.userId, ctx.userId)),
      ]);
      const dup = [...existingLeads, ...existingClients].some(
        (r) => r.name.trim().toLowerCase() === key
      );
      if (dup) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${input.companyName} is already a lead or client.`,
        });
      }

      const [activeDir] = await db
        .select({ id: directions.id })
        .from(directions)
        .where(and(eq(directions.userId, ctx.userId), isNull(directions.retiredAt)))
        .limit(1);

      const [row] = await db
        .insert(leads)
        .values({
          userId: ctx.userId,
          orgId: ctx.orgId,
          companyName: input.companyName,
          notes: input.notes ?? null,
          source: "manual",
          directionId: activeDir?.id ?? null,
        })
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add lead." });
      }
      await syncLeadRow(row.id, "insert", row);
      return row;
    }),

  /** The triage board — unsettled leads, confidence-adjusted rank computed at read. */
  listLeads: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.userId, ctx.userId), inArray(leads.state, [...BOARD_STATES])));
    // Untriaged prospects roll over between runs but lose priority as they age
    // (W10i) — the board self-sorts towards what is actually fresh.
    const now = new Date();
    const ranked = rankLeads(
      rows.map((r) => ({
        id: r.id,
        score: r.score,
        confidence: r.confidence,
        ageDays: ageInDays(r.createdAt, now),
      }))
    );
    const byId = new Map(ranked.map((r) => [r.id, r]));
    return rows
      .map((r) => ({
        ...r,
        rank: byId.get(r.id)?.rank ?? 0,
        highPotentialUnverified: byId.get(r.id)?.highPotentialUnverified ?? false,
      }))
      .sort((a, b) => a.rank - b.rank);
  }),

  /**
   * Research a company on the open web (W10h) and store what it found.
   *
   * **This call costs money** — the web plugin bills per search result — so the facts
   * are persisted on the lead and reused. Re-running is an explicit act (the Research
   * button on an already-researched card), never something a re-render or a re-score
   * triggers behind the user's back.
   */
  researchLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!isWebResearchConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Web research isn't configured (OPENROUTER_API_KEY).",
        });
      }

      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      const [settingsRow] = await db
        .select()
        .from(sourcingSettings)
        .where(eq(sourcingSettings.userId, ctx.userId))
        .limit(1);

      const { facts, provider } = await researchCompany({
        companyName: lead.companyName,
        companyNotes: lead.notes ?? "",
        segments: settingsRow?.segments ?? [],
      });

      const [row] = await db
        .update(leads)
        .set({
          research: facts,
          researchedAt: new Date(),
          researchProvider: provider,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, lead.id), eq(leads.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      await syncLeadRow(row.id, "update", row);

      return { lead: row, facts };
    }),

  /**
   * Score one lead against the ICP (W10c). Needs OPENROUTER_API_KEY.
   *
   * Reads whatever research is already stored on the lead (W10h) but never buys more:
   * scoring an unresearched company is allowed and simply scores thin, with the
   * missing factors named as gaps and the confidence low — which is exactly the
   * signal the triage board's "high potential · unverified" pill is built on.
   */
  scoreLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!isModelConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The scoring model isn't configured (OPENROUTER_API_KEY).",
        });
      }

      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      const [settingsRow] = await db
        .select()
        .from(sourcingSettings)
        .where(eq(sourcingSettings.userId, ctx.userId))
        .limit(1);
      const [directionRows, clientRows, rateRows] = await Promise.all([
        db
          .select({ statement: directions.statement })
          .from(directions)
          .where(and(eq(directions.userId, ctx.userId), isNull(directions.retiredAt))),
        db.select({ name: clients.name }).from(clients).where(eq(clients.userId, ctx.userId)),
        db
          .select({ amountCents: rates.amountCents })
          .from(rates)
          .where(eq(rates.userId, ctx.userId)),
      ]);

      const result = await scoreCompany({
        companyName: lead.companyName,
        companyNotes: lead.notes ?? "",
        researchedFacts: lead.research ? renderFactsForScoring(lead.research) : null,
        segments: settingsRow?.segments ?? [],
        weights: settingsRow?.weights ?? DEFAULT_WEIGHTS,
        exclusions: settingsRow?.exclusions ?? [],
        directions: directionRows.map((d) => d.statement),
        wonClientNames: clientRows.map((c) => c.name),
        rateFloorCents: rateRows.length ? Math.min(...rateRows.map((r) => r.amountCents)) : null,
      });

      const [scored] = await db
        .update(leads)
        .set({
          score: result.score,
          confidence: result.confidence,
          rationale: result.rationale,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, lead.id), eq(leads.userId, ctx.userId)))
        .returning();
      if (scored) await syncLeadRow(scored.id, "update", scored);

      return { lead: scored, ...result };
    }),

  /**
   * Run a gap-fill pass over a lead's research (W10j) — a second, targeted search at
   * the facts the first pass couldn't confirm.
   *
   * Requires the lead's segment to have enrichment on. That gate is the plan's rule:
   * you turn gap-filling on for a segment whose confidence is chronically low, not
   * for everything. Enrichment may only FILL what research left null, never overwrite
   * it, so re-running is safe and boring.
   */
  enrichLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (!lead.research) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Research this company first — enrichment closes gaps, it doesn't open them.",
        });
      }

      const [settingsRow] = await db
        .select({ segments: sourcingSettings.segments })
        .from(sourcingSettings)
        .where(eq(sourcingSettings.userId, ctx.userId))
        .limit(1);
      const segment = (settingsRow?.segments ?? []).find((s) => s.id === lead.segment);

      if (segment?.enrichment !== "web") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Turn on gap-filling for this segment in Settings first.",
        });
      }

      const result = await enrichLead({
        companyName: lead.companyName,
        facts: lead.research,
        mode: segment.enrichment,
      });

      if (result.provider === null) {
        return { lead, resolved: 0, provider: null };
      }

      const [row] = await db
        .update(leads)
        .set({ research: result.facts, updatedAt: new Date() })
        .where(and(eq(leads.id, lead.id), eq(leads.userId, ctx.userId)))
        .returning();
      if (row) await syncLeadRow(row.id, "update", row);

      return { lead: row ?? lead, resolved: result.resolved, provider: result.provider };
    }),

  /**
   * Mean confidence per ICP segment — the evidence for whether a segment would
   * benefit from a paid data vendor (W10j).
   *
   * Confidence, not score: a low-scoring segment means the ICP is aimed at the wrong
   * market, and buying data would only describe the wrong companies more precisely.
   * A low-CONFIDENCE segment means the agent keeps failing to find enough out, which
   * is the thing data actually fixes.
   */
  confidenceHealth: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({ segment: leads.segment, confidence: leads.confidence })
      .from(leads)
      .where(eq(leads.userId, ctx.userId));
    return segmentConfidenceHealth(rows);
  }),

  /** Dismiss a lead with a one-tap reason (kept as Filter-learning evidence). */
  dismissLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid(), reason: z.enum(DISMISS_REASONS) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(leads)
        .set({ state: "dismissed", dismissReason: input.reason, updatedAt: new Date() })
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      await syncLeadRow(row.id, "update", row);
      return row;
    }),

  /** Snooze a lead off the board until a date (bad-timing dismissals land here). */
  snoozeLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid(), until: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(leads)
        .set({ state: "snoozed", snoozeUntil: input.until, updatedAt: new Date() })
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      await syncLeadRow(row.id, "update", row);
      return row;
    }),

  /**
   * Move a deal along the pipeline (W10f) — the one mutation the board's stage
   * controls call, forward or back. The stage vocabulary and the promotion rule
   * both come from src/lib/sourcing/pipeline.ts.
   *
   * The side effects are what make this more than a state write:
   *  - reaching `contacted` (or anything deeper) earns the lead its prospect
   *    project, created on demand and idempotently;
   *  - `signed` turns that project into active work with a client attached;
   *  - `declined`/`lost` stamp `closedAt` and archive the prospect off the board,
   *    keeping the row as evidence;
   *  - moving a closed deal back to an open stage undoes all of that — the project
   *    comes back, un-signed and un-linked from the client (the client row itself
   *    is never deleted).
   */
  setStage: protectedProcedure
    .input(z.object({ leadId: z.string().uuid(), stage: z.enum(SETTABLE_STAGES) }))
    .mutation(async ({ ctx, input }) => {
      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (lead.state === input.stage) return lead;

      const wasClosed = isClosedStage(lead.state);
      const nowClosed = isClosedStage(input.stage);
      const now = new Date();

      // Promotion first: everything downstream needs the project to exist.
      let projectId = lead.projectId;
      if (!nowClosed || input.stage === "signed") {
        const stage = input.stage as PipelineStage;
        if (stagePromotes(stage)) {
          const ensured = await ensureProspectProject(ctx, {
            id: lead.id,
            companyName: lead.companyName,
            projectId: lead.projectId,
          });
          projectId = ensured.projectId;
        }
      }

      if (input.stage === "signed" && projectId) {
        await signProject(ctx, projectId, lead.companyName);
      } else if (nowClosed && projectId) {
        // declined / lost — off the board, retained.
        await archiveProject(ctx, projectId);
      } else if (wasClosed && projectId) {
        // Reopening: undo whichever close it was.
        if (lead.state === "signed") await unsignProject(ctx, projectId);
        else await unarchiveProject(ctx, projectId);
      }

      const [row] = await db
        .update(leads)
        .set({
          state: input.stage,
          projectId,
          closedAt: nowClosed ? (lead.closedAt ?? now) : null,
          // A deal that moves is no longer snoozed or dismissed.
          snoozeUntil: null,
          dismissReason: null,
          updatedAt: now,
        })
        .where(and(eq(leads.id, lead.id), eq(leads.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      await syncLeadRow(row.id, "update", row);
      return row;
    }),

  /** Closed deals, most recent first — the board's collapsed "what happened" list. */
  listClosed: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      return db
        .select({
          id: leads.id,
          companyName: leads.companyName,
          state: leads.state,
          score: leads.score,
          projectId: leads.projectId,
          closedAt: leads.closedAt,
        })
        .from(leads)
        .where(and(eq(leads.userId, ctx.userId), inArray(leads.state, [...CLOSED_STAGES])))
        .orderBy(desc(leads.closedAt))
        .limit(input?.limit ?? 20);
    }),

  /**
   * The proposal figures for the user's deals, keyed by project.
   *
   * A SEPARATE read from `listLeads` on purpose: this is `financial`-class money and
   * that one returns `org_shared` rows. Keeping the money on its own procedure is
   * what lets role enforcement, when it lands, gate this and only this — rather than
   * having to strip fields out of a shared payload.
   */
  listProposals: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        projectId: projectFees.projectId,
        proposalAmountCents: projectFees.proposalAmountCents,
        proposedAt: projectFees.proposedAt,
      })
      .from(projectFees)
      .where(eq(projectFees.userId, ctx.userId));
  }),

  /**
   * Record what a deal was quoted at. The amount lands in `project_fees`
   * (financial-class), never on the lead — so a Member reading `leads` sees the
   * company and the score, and no dollar figure at all.
   *
   * Requires a promoted project, which the Proposal stage guarantees. Passing null
   * clears the figure.
   */
  setProposalAmount: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        amountCents: z.number().int().min(0).max(1_000_000_00).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [lead] = await db
        .select({ id: leads.id, state: leads.state, projectId: leads.projectId })
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (!lead.projectId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Move the deal to Proposal before recording an amount.",
        });
      }
      if (!isClosedStage(lead.state) && !stageTakesProposal(lead.state as PipelineStage)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Move the deal to Proposal before recording an amount.",
        });
      }

      const now = new Date();
      const [existing] = await db
        .select({ id: projectFees.id })
        .from(projectFees)
        .where(and(eq(projectFees.userId, ctx.userId), eq(projectFees.projectId, lead.projectId)))
        .limit(1);

      let row;
      if (existing) {
        [row] = await db
          .update(projectFees)
          .set({
            proposalAmountCents: input.amountCents,
            proposedAt: input.amountCents === null ? null : now,
            updatedAt: now,
          })
          .where(and(eq(projectFees.id, existing.id), eq(projectFees.userId, ctx.userId)))
          .returning();
      } else {
        [row] = await db
          .insert(projectFees)
          .values({
            userId: ctx.userId,
            orgId: ctx.orgId,
            projectId: lead.projectId,
            proposalAmountCents: input.amountCents,
            proposedAt: input.amountCents === null ? null : now,
          })
          .returning();
      }
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save the proposal amount.",
        });
      }
      await syncProjectFeeRow(row.id, existing ? "update" : "insert", row);
      return row;
    }),

  /**
   * The weekly run's state for the Pipeline board: the latest run, and what the agent
   * has spent in the last 30 days against its ceiling.
   *
   * The spend is read from `sourcing_run_costs` (financial-class) and returned only
   * here, never folded into `listLeads` — the same separation as the proposal amount.
   */
  runStatus: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const [latest] = await db
      .select()
      .from(sourcingRuns)
      .where(eq(sourcingRuns.userId, ctx.userId))
      .orderBy(desc(sourcingRuns.createdAt))
      .limit(1);

    const costRows = await db
      .select({
        amountCents: sourcingRunCosts.amountCents,
        amountMicros: sourcingRunCosts.amountMicros,
      })
      .from(sourcingRunCosts)
      .where(
        and(
          eq(sourcingRunCosts.userId, ctx.userId),
          gte(sourcingRunCosts.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
        )
      );

    const spentCents = costRows.reduce(
      (total, row) => total + spendToCents({ cents: row.amountCents, micros: row.amountMicros }),
      0
    );
    const ceilingCents = monthlyCeilingCents(process.env);

    return {
      latest: latest ?? null,
      spentCents,
      ceilingCents,
      atCeiling: !checkBudget({ spentLast30DaysCents: spentCents, ceilingCents }).allowed,
    };
  }),

  /**
   * "Source now" — start a batch by hand, outside the Tuesday schedule.
   *
   * It only CREATES the run; the same worker that serves the cron does the work on
   * its next tick. One engine, one set of budget checks, one place a bug can live —
   * a manual path that researched inline would be a second implementation of the
   * expensive part.
   *
   * The ceiling applies here too. Being at the keyboard doesn't make the money
   * different.
   */
  startRun: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isWebResearchConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Web research isn't configured (OPENROUTER_API_KEY).",
      });
    }

    const now = new Date();
    const [inFlight] = await db
      .select({ id: sourcingRuns.id })
      .from(sourcingRuns)
      .where(
        and(
          eq(sourcingRuns.userId, ctx.userId),
          inArray(sourcingRuns.status, ["discovering", "researching"])
        )
      )
      .limit(1);
    if (inFlight) {
      throw new TRPCError({ code: "CONFLICT", message: "A run is already in progress." });
    }

    const costRows = await db
      .select({
        amountCents: sourcingRunCosts.amountCents,
        amountMicros: sourcingRunCosts.amountMicros,
      })
      .from(sourcingRunCosts)
      .where(
        and(
          eq(sourcingRunCosts.userId, ctx.userId),
          gte(sourcingRunCosts.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
        )
      );
    const spentCents = costRows.reduce(
      (total, row) => total + spendToCents({ cents: row.amountCents, micros: row.amountMicros }),
      0
    );
    const ceilingCents = monthlyCeilingCents(process.env);
    if (!checkBudget({ spentLast30DaysCents: spentCents, ceilingCents }).allowed) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `The 30-day research ceiling has been reached (${spentCents.toFixed(1)}¢ of ${ceilingCents}¢).`,
      });
    }

    const [settingsRow] = await db
      .select({ batchSize: sourcingSettings.weeklyRunBatchSize })
      .from(sourcingSettings)
      .where(eq(sourcingSettings.userId, ctx.userId))
      .limit(1);

    const [row] = await db
      .insert(sourcingRuns)
      .values({
        userId: ctx.userId,
        orgId: ctx.orgId,
        trigger: "manual",
        status: "discovering",
        weekKey: isoWeekKey(now),
        batchSize: clampBatchSize(settingsRow?.batchSize),
      })
      .returning();
    if (!row) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start the run." });
    }
    await syncSourcingRunRow(row.id, "insert", row);
    return row;
  }),

  /** The drafted opener + follow-ups for one lead, in send order. */
  listOutreach: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(leadOutreach)
        .where(and(eq(leadOutreach.leadId, input.leadId), eq(leadOutreach.userId, ctx.userId)))
        .orderBy(asc(leadOutreach.sortOrder));
    }),

  /**
   * Draft the opener + follow-ups for a lead (W10e). Mirrors the voice profile and
   * leads with the real fit reasons. Regenerating replaces the UNSENT drafts and
   * leaves anything already marked sent untouched. Needs OPENROUTER_API_KEY.
   */
  draftOutreach: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!isModelConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The drafting model isn't configured (OPENROUTER_API_KEY).",
        });
      }

      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      const [settingsRow] = await db
        .select()
        .from(sourcingSettings)
        .where(eq(sourcingSettings.userId, ctx.userId))
        .limit(1);
      const [directionRows, clientRows] = await Promise.all([
        db
          .select({ statement: directions.statement })
          .from(directions)
          .where(and(eq(directions.userId, ctx.userId), isNull(directions.retiredAt))),
        db.select({ name: clients.name }).from(clients).where(eq(clients.userId, ctx.userId)),
      ]);

      const result = await draftOutreach({
        companyName: lead.companyName,
        companyNotes: lead.notes ?? "",
        rationale: lead.rationale ?? null,
        voice: settingsRow?.outreachVoice ?? DEFAULT_VOICE,
        directions: directionRows.map((d) => d.statement),
        wonClientNames: clientRows.map((c) => c.name),
        followUpCount: FOLLOW_UP_COUNT,
      });

      // Clear the old unsent drafts before writing the new run; keep any sent.
      const existing = await db
        .select({ id: leadOutreach.id, status: leadOutreach.status })
        .from(leadOutreach)
        .where(and(eq(leadOutreach.leadId, lead.id), eq(leadOutreach.userId, ctx.userId)));
      const staleIds = existing.filter((r) => r.status === "draft").map((r) => r.id);
      if (staleIds.length) {
        await db
          .delete(leadOutreach)
          .where(and(inArray(leadOutreach.id, staleIds), eq(leadOutreach.userId, ctx.userId)));
        for (const id of staleIds) await syncLeadOutreachRow(id, "delete", { id });
      }

      const messages = [
        { kind: "opener" as const, body: result.opener },
        ...result.followUps.map((body) => ({ kind: "follow_up" as const, body })),
      ];
      const drafted = [];
      for (let i = 0; i < messages.length; i++) {
        const [row] = await db
          .insert(leadOutreach)
          .values({
            userId: ctx.userId,
            orgId: ctx.orgId,
            leadId: lead.id,
            kind: messages[i].kind,
            body: messages[i].body,
            sortOrder: i,
          })
          .returning();
        if (row) {
          await syncLeadOutreachRow(row.id, "insert", row);
          drafted.push(row);
        }
      }
      return drafted;
    }),

  /** Edit a draft before sending — Flowstate drafts, you shape it (Law 1). */
  updateOutreachBody: protectedProcedure
    .input(z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(leadOutreach)
        .set({ body: input.body, updatedAt: new Date() })
        .where(and(eq(leadOutreach.id, input.id), eq(leadOutreach.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found." });
      await syncLeadOutreachRow(row.id, "update", row);
      return row;
    }),

  /**
   * Mark a draft sent (you copy/open-in-mail and send it yourself — Law 1). The first
   * send on a lead advances it new → contacted.
   */
  markOutreachSent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(leadOutreach)
        .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
        .where(and(eq(leadOutreach.id, input.id), eq(leadOutreach.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found." });
      await syncLeadOutreachRow(row.id, "update", row);

      const [lead] = await db
        .select({ id: leads.id, state: leads.state })
        .from(leads)
        .where(and(eq(leads.id, row.leadId), eq(leads.userId, ctx.userId)))
        .limit(1);
      if (lead?.state === "new") {
        const [advanced] = await db
          .update(leads)
          .set({ state: "contacted", updatedAt: new Date() })
          .where(and(eq(leads.id, lead.id), eq(leads.userId, ctx.userId)))
          .returning();
        if (advanced) await syncLeadRow(advanced.id, "update", advanced);
      }
      return row;
    }),
});
