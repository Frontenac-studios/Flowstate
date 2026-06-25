import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncProtectedBlockRow, syncProtectedBlockTemplateRow } from "@/db/record-sync-mutation";
import { protectedBlockTemplates, protectedBlocks } from "@/db/tables";
import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const categorySchema = z.enum(PROJECT_CATEGORIES);
const isoWeekdaySchema = z.number().int().min(0).max(6);

function weekDateRange(anchorDate: string): { start: string; end: string; dates: string[] } {
  const ref = parseISODateString(anchorDate);
  const dates = datesInIsoWeek(ref).map(toISODateString);
  return { start: dates[0]!, end: dates[dates.length - 1]!, dates };
}

export const protectedBlocksRouter = createTRPCRouter({
  listForWeek: protectedProcedure
    .input(z.object({ anchorDate: isoDateSchema }))
    .query(async ({ ctx, input }) => {
      const { start, end } = weekDateRange(input.anchorDate);
      return db
        .select({
          id: protectedBlocks.id,
          category: protectedBlocks.category,
          scheduledDate: protectedBlocks.scheduledDate,
          label: protectedBlocks.label,
          startMin: protectedBlocks.startMin,
          endMin: protectedBlocks.endMin,
          templateId: protectedBlocks.templateId,
          status: protectedBlocks.status,
        })
        .from(protectedBlocks)
        .where(
          and(
            eq(protectedBlocks.userId, ctx.userId),
            gte(protectedBlocks.scheduledDate, start),
            lte(protectedBlocks.scheduledDate, end)
          )
        )
        .orderBy(asc(protectedBlocks.scheduledDate), asc(protectedBlocks.startMin));
    }),

  listForDate: protectedProcedure
    .input(z.object({ date: isoDateSchema }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          id: protectedBlocks.id,
          category: protectedBlocks.category,
          scheduledDate: protectedBlocks.scheduledDate,
          label: protectedBlocks.label,
          startMin: protectedBlocks.startMin,
          endMin: protectedBlocks.endMin,
          status: protectedBlocks.status,
        })
        .from(protectedBlocks)
        .where(
          and(
            eq(protectedBlocks.userId, ctx.userId),
            eq(protectedBlocks.scheduledDate, input.date),
            inArray(protectedBlocks.status, ["confirmed", "proposed"])
          )
        )
        .orderBy(asc(protectedBlocks.startMin));
    }),

  create: protectedProcedure
    .input(
      z
        .object({
          category: categorySchema,
          scheduledDate: isoDateSchema,
          label: z.string().max(200).nullable().optional(),
          startMin: z
            .number()
            .int()
            .min(0)
            .max(24 * 60 - 1)
            .nullable()
            .optional(),
          endMin: z
            .number()
            .int()
            .min(1)
            .max(24 * 60)
            .nullable()
            .optional(),
          templateId: z.string().uuid().nullable().optional(),
          status: z.enum(["proposed", "confirmed"]).default("confirmed"),
        })
        .superRefine((v, ctx) => {
          const hasStart = v.startMin != null;
          const hasEnd = v.endMin != null;
          if (hasStart !== hasEnd) {
            ctx.addIssue({
              code: "custom",
              message: "startMin and endMin must both be set or both omitted.",
            });
          }
          if (hasStart && v.endMin! <= v.startMin!) {
            ctx.addIssue({ code: "custom", message: "endMin must be after startMin." });
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(protectedBlocks)
        .values({
          userId: ctx.userId,
          category: input.category,
          scheduledDate: input.scheduledDate,
          label: input.label ?? null,
          startMin: input.startMin ?? null,
          endMin: input.endMin ?? null,
          templateId: input.templateId ?? null,
          status: input.status,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create protected block.",
        });
      }

      await syncProtectedBlockRow(row.id, "insert", row);
      return row;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(protectedBlocks)
        .where(and(eq(protectedBlocks.id, input.id), eq(protectedBlocks.userId, ctx.userId)))
        .returning({ id: protectedBlocks.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Protected block not found." });
      }

      await syncProtectedBlockRow(row.id, "delete", { id: row.id });
      return row;
    }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(protectedBlockTemplates)
      .where(eq(protectedBlockTemplates.userId, ctx.userId))
      .orderBy(asc(protectedBlockTemplates.isoWeekday), asc(protectedBlockTemplates.category));
  }),

  upsertTemplate: protectedProcedure
    .input(
      z
        .object({
          id: z.string().uuid().optional(),
          category: categorySchema,
          isoWeekday: isoWeekdaySchema,
          label: z.string().max(200).nullable().optional(),
          startMin: z
            .number()
            .int()
            .min(0)
            .max(24 * 60 - 1)
            .nullable()
            .optional(),
          endMin: z
            .number()
            .int()
            .min(1)
            .max(24 * 60)
            .nullable()
            .optional(),
        })
        .superRefine((v, ctx) => {
          const hasStart = v.startMin != null;
          const hasEnd = v.endMin != null;
          if (hasStart !== hasEnd) {
            ctx.addIssue({
              code: "custom",
              message: "startMin and endMin must both be set or both omitted.",
            });
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const values = {
        category: input.category,
        isoWeekday: input.isoWeekday,
        label: input.label ?? null,
        startMin: input.startMin ?? null,
        endMin: input.endMin ?? null,
        updatedAt: now,
      };

      if (input.id) {
        const [row] = await db
          .update(protectedBlockTemplates)
          .set(values)
          .where(
            and(
              eq(protectedBlockTemplates.id, input.id),
              eq(protectedBlockTemplates.userId, ctx.userId)
            )
          )
          .returning();

        if (!row) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
        }

        await syncProtectedBlockTemplateRow(row.id, "update", row);
        return row;
      }

      const [row] = await db
        .insert(protectedBlockTemplates)
        .values({ userId: ctx.userId, ...values })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create template.",
        });
      }

      await syncProtectedBlockTemplateRow(row.id, "insert", row);
      return row;
    }),

  removeTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(protectedBlockTemplates)
        .where(
          and(
            eq(protectedBlockTemplates.id, input.id),
            eq(protectedBlockTemplates.userId, ctx.userId)
          )
        )
        .returning({ id: protectedBlockTemplates.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
      }

      await syncProtectedBlockTemplateRow(row.id, "delete", { id: row.id });
      return row;
    }),

  proposeFromTemplates: protectedProcedure
    .input(z.object({ anchorDate: isoDateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { dates } = weekDateRange(input.anchorDate);
      const templates = await db
        .select()
        .from(protectedBlockTemplates)
        .where(eq(protectedBlockTemplates.userId, ctx.userId));

      if (templates.length === 0) {
        return { created: 0 };
      }

      const existing = await db
        .select({
          scheduledDate: protectedBlocks.scheduledDate,
          templateId: protectedBlocks.templateId,
        })
        .from(protectedBlocks)
        .where(
          and(
            eq(protectedBlocks.userId, ctx.userId),
            inArray(protectedBlocks.scheduledDate, dates),
            inArray(protectedBlocks.status, ["confirmed", "proposed"])
          )
        );

      const existingKeys = new Set(
        existing.filter((r) => r.templateId).map((r) => `${r.templateId}:${r.scheduledDate}`)
      );

      let created = 0;
      for (const template of templates) {
        const scheduledDate = dates[template.isoWeekday];
        if (!scheduledDate) continue;
        const key = `${template.id}:${scheduledDate}`;
        if (existingKeys.has(key)) continue;

        const [row] = await db
          .insert(protectedBlocks)
          .values({
            userId: ctx.userId,
            category: template.category,
            scheduledDate,
            label: template.label,
            startMin: template.startMin,
            endMin: template.endMin,
            templateId: template.id,
            status: "proposed",
          })
          .returning();

        if (row) {
          await syncProtectedBlockRow(row.id, "insert", row);
          existingKeys.add(key);
          created += 1;
        }
      }

      return { created };
    }),

  confirmProposedForWeek: protectedProcedure
    .input(z.object({ anchorDate: isoDateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { dates } = weekDateRange(input.anchorDate);
      const now = new Date();

      const rows = await db
        .update(protectedBlocks)
        .set({ status: "confirmed", updatedAt: now })
        .where(
          and(
            eq(protectedBlocks.userId, ctx.userId),
            inArray(protectedBlocks.scheduledDate, dates),
            eq(protectedBlocks.status, "proposed")
          )
        )
        .returning({ id: protectedBlocks.id });

      for (const row of rows) {
        const [full] = await db
          .select()
          .from(protectedBlocks)
          .where(eq(protectedBlocks.id, row.id))
          .limit(1);
        if (full) await syncProtectedBlockRow(full.id, "update", full);
      }

      return { confirmed: rows.length };
    }),
});
