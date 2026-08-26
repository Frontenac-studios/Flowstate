import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import {
  syncBusinessExpenseRow,
  syncMoneySettingsRow,
  syncOwnerDrawRow,
} from "@/db/record-sync-mutation";
import { businessExpenses, invoices, moneySettings, ownerDraws } from "@/db/tables";
import { computeDrawPanel } from "@/lib/money/compute-draw-panel";

import { createTRPCRouter, protectedProcedure } from "../init";

const BURN_WINDOW_DAYS = 90;
const BURN_WINDOW_MONTHS = 3;

const centsSchema = z.number().int().min(0).max(1_000_000_00);

export const moneyRouter = createTRPCRouter({
  /** The held Draw-panel figures. Null throughout means "not set yet" — the UI prompts. */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select()
      .from(moneySettings)
      .where(eq(moneySettings.userId, ctx.userId))
      .limit(1);
    return {
      taxReservePercentBps: row?.taxReservePercent ?? null,
      costOfLivingCents: row?.costOfLivingCents ?? null,
      personalSavingsCents: row?.personalSavingsCents ?? null,
      minimumDrawCents: row?.minimumDrawCents ?? null,
      bankBalanceCents: row?.bankBalanceCents ?? null,
      bankBalanceReconciledAt: row?.bankBalanceReconciledAt ?? null,
    };
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        // Tax reserve as a whole/decimal percent (0–100); stored as basis points.
        taxReservePercent: z.number().min(0).max(100).nullable().optional(),
        costOfLivingCents: centsSchema.nullable().optional(),
        personalSavingsCents: centsSchema.nullable().optional(),
        minimumDrawCents: centsSchema.nullable().optional(),
        bankBalanceCents: centsSchema.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const patch: Partial<typeof moneySettings.$inferInsert> = { updatedAt: now };
      if (input.taxReservePercent !== undefined)
        patch.taxReservePercent =
          input.taxReservePercent == null ? null : Math.round(input.taxReservePercent * 100);
      if (input.costOfLivingCents !== undefined) patch.costOfLivingCents = input.costOfLivingCents;
      if (input.personalSavingsCents !== undefined)
        patch.personalSavingsCents = input.personalSavingsCents;
      if (input.minimumDrawCents !== undefined) patch.minimumDrawCents = input.minimumDrawCents;
      if (input.bankBalanceCents !== undefined) {
        patch.bankBalanceCents = input.bankBalanceCents;
        // Setting the balance is the reconcile moment — stamp when it was true.
        patch.bankBalanceReconciledAt = input.bankBalanceCents == null ? null : now;
      }

      const [existing] = await db
        .select({ userId: moneySettings.userId })
        .from(moneySettings)
        .where(eq(moneySettings.userId, ctx.userId))
        .limit(1);

      let row;
      if (existing) {
        [row] = await db
          .update(moneySettings)
          .set(patch)
          .where(eq(moneySettings.userId, ctx.userId))
          .returning();
      } else {
        [row] = await db
          .insert(moneySettings)
          .values({ userId: ctx.userId, orgId: ctx.orgId, ...patch })
          .returning();
      }
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save settings." });

      await syncMoneySettingsRow(ctx.userId, existing ? "update" : "insert", row);
      return row;
    }),

  listExpenses: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(businessExpenses)
      .where(eq(businessExpenses.userId, ctx.userId))
      .orderBy(desc(businessExpenses.incurredOn));
  }),

  addExpense: protectedProcedure
    .input(
      z.object({
        amountCents: centsSchema,
        description: z.string().trim().max(300).optional(),
        category: z.string().trim().max(80).optional(),
        incurredOn: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(businessExpenses)
        .values({
          userId: ctx.userId,
          orgId: ctx.orgId,
          amountCents: input.amountCents,
          description: input.description ?? null,
          category: input.category ?? null,
          incurredOn: input.incurredOn,
          source: "manual",
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add expense." });
      await syncBusinessExpenseRow(row.id, "insert", row);
      return row;
    }),

  deleteExpense: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(businessExpenses)
        .where(and(eq(businessExpenses.id, input.id), eq(businessExpenses.userId, ctx.userId)))
        .returning({ id: businessExpenses.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found." });
      await syncBusinessExpenseRow(input.id, "delete", { id: input.id });
      return { id: input.id };
    }),

  listDraws: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(ownerDraws)
      .where(eq(ownerDraws.userId, ctx.userId))
      .orderBy(desc(ownerDraws.drawnOn));
  }),

  addDraw: protectedProcedure
    .input(
      z.object({
        amountCents: centsSchema,
        drawnOn: z.coerce.date(),
        note: z.string().trim().max(300).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(ownerDraws)
        .values({
          userId: ctx.userId,
          orgId: ctx.orgId,
          amountCents: input.amountCents,
          drawnOn: input.drawnOn,
          note: input.note ?? null,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to log draw." });
      await syncOwnerDrawRow(row.id, "insert", row);
      return row;
    }),

  deleteDraw: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(ownerDraws)
        .where(and(eq(ownerDraws.id, input.id), eq(ownerDraws.userId, ctx.userId)))
        .returning({ id: ownerDraws.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Draw not found." });
      await syncOwnerDrawRow(input.id, "delete", { id: input.id });
      return { id: input.id };
    }),

  /**
   * The Draw panel's assembled numbers. Sums are done in JS (small, single-user
   * tables, matching the time report); the ledger math lives in the pure
   * computeDrawPanel so it stays testable.
   */
  drawPanel: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const burnCutoff = new Date(now.getTime() - BURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [invoiceRows, expenseRows, drawRows, settingsRow] = await Promise.all([
      db
        .select({ amountCents: invoices.amountCents, status: invoices.status, paidAt: invoices.paidAt })
        .from(invoices)
        .where(eq(invoices.userId, ctx.userId)),
      db
        .select({ amountCents: businessExpenses.amountCents, incurredOn: businessExpenses.incurredOn })
        .from(businessExpenses)
        .where(eq(businessExpenses.userId, ctx.userId)),
      db
        .select({ amountCents: ownerDraws.amountCents })
        .from(ownerDraws)
        .where(eq(ownerDraws.userId, ctx.userId)),
      db.select().from(moneySettings).where(eq(moneySettings.userId, ctx.userId)).limit(1),
    ]);

    let collectedRevenueCents = 0;
    let billedUnpaidRevenueCents = 0;
    for (const inv of invoiceRows) {
      if (inv.status !== "accepted") continue; // void invoices are not revenue
      if (inv.paidAt) collectedRevenueCents += inv.amountCents;
      else billedUnpaidRevenueCents += inv.amountCents;
    }

    const expensesCents = expenseRows.reduce((s, e) => s + e.amountCents, 0);
    const recentExpensesCents = expenseRows
      .filter((e) => e.incurredOn >= burnCutoff)
      .reduce((s, e) => s + e.amountCents, 0);
    const monthlyBurnCents = Math.round(recentExpensesCents / BURN_WINDOW_MONTHS);

    const drawsCents = drawRows.reduce((s, d) => s + d.amountCents, 0);

    const settings = settingsRow[0];

    return computeDrawPanel({
      collectedRevenueCents,
      billedUnpaidRevenueCents,
      expensesCents,
      drawsCents,
      monthlyBurnCents,
      settings: {
        taxReservePercentBps: settings?.taxReservePercent ?? null,
        costOfLivingCents: settings?.costOfLivingCents ?? null,
        personalSavingsCents: settings?.personalSavingsCents ?? null,
        minimumDrawCents: settings?.minimumDrawCents ?? null,
        bankBalanceCents: settings?.bankBalanceCents ?? null,
      },
    });
  }),
});
