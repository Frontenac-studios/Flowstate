import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncSourcingSettingsRow } from "@/db/record-sync-mutation";
import { clients, directions, rates, sourcingSettings, targets } from "@/db/tables";
import { buildIcpSeed } from "@/lib/sourcing/seed";

import { createTRPCRouter, protectedProcedure } from "../init";

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
});
