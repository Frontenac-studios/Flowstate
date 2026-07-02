import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { appSettings } from "@/db/tables";
import { evidenceCadenceSchema } from "@/lib/settings/constants";
import { toISODateString } from "@/lib/dates/local-day";
import { startOfLocalDay } from "@/lib/dates/local-day";
import {
  generateEvidenceEdition,
  getLatestEvidenceEdition,
  listEvidenceEditions,
  markEvidenceEditionSeen,
  maybeGeneratePeriodicEdition,
  quarterPeriodForDate,
} from "@/server/evidence/generate-edition";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "../init";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const evidenceRouter = createTRPCRouter({
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    return getLatestEvidenceEdition(ctx.userId);
  }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(24).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return listEvidenceEditions(ctx.userId, input?.limit ?? 12);
    }),

  markSeen: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await markEvidenceEditionSeen(ctx.userId, input.id);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Edition not found." });
      }
      return row;
    }),

  setCadence: protectedProcedure
    .input(z.object({ evidenceCadence: evidenceCadenceSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(appSettings)
        .set({ evidenceCadence: input.evidenceCadence, updatedAt: new Date() })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Settings not found." });
      }
      return row;
    }),

  ensurePeriodic: protectedProcedure
    .input(z.object({ localDate: localDateSchema.optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const [settings] = await db
        .select({ evidenceCadence: appSettings.evidenceCadence })
        .from(appSettings)
        .where(eq(appSettings.userId, ctx.userId))
        .limit(1);

      const cadence = (settings?.evidenceCadence ?? "quarterly") as "monthly" | "quarterly" | "off";
      const todayIso = input?.localDate ?? toISODateString(startOfLocalDay());
      return maybeGeneratePeriodicEdition(ctx.userId, cadence, todayIso);
    }),

  generateMilestone: protectedProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const todayIso = toISODateString(startOfLocalDay());
      const period = quarterPeriodForDate(todayIso);
      return generateEvidenceEdition({
        userId: ctx.userId,
        kind: "milestone",
        periodStart: period.start,
        periodEnd: period.end,
        refId: input.goalId,
      });
    }),
});
