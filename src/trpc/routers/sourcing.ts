import { and, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncLeadRow, syncSourcingSettingsRow } from "@/db/record-sync-mutation";
import { clients, directions, leads, rates, sourcingSettings, targets } from "@/db/tables";
import { isModelConfigured } from "@/lib/env";
import { DEFAULT_WEIGHTS } from "@/lib/sourcing/constants";
import { rankLeads } from "@/lib/sourcing/scoring";
import { buildIcpSeed } from "@/lib/sourcing/seed";
import { scoreCompany } from "@/server/sourcing/score-company";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Leads visible on the triage board — everything not settled or set aside. */
const TRIAGE_STATES = ["new", "contacted", "engaged", "proposal"] as const;

const segmentSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  firmographics: z.string().trim().max(2000),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Partial<typeof sourcingSettings.$inferInsert> = { updatedAt: new Date() };
      if (input.segments !== undefined) patch.segments = input.segments;
      if (input.exclusions !== undefined) patch.exclusions = input.exclusions;
      if (input.weights !== undefined) patch.weights = input.weights;
      if (input.outreachVoice !== undefined) patch.outreachVoice = input.outreachVoice;

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
      .where(and(eq(leads.userId, ctx.userId), inArray(leads.state, [...TRIAGE_STATES])));
    const ranked = rankLeads(
      rows.map((r) => ({ id: r.id, score: r.score, confidence: r.confidence }))
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

  /** Score one lead against the ICP (W10c). Needs OPENROUTER_API_KEY. */
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
});
