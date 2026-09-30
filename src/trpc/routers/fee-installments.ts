import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncFeeInstallmentRow } from "@/db/record-sync-mutation";
import { clients, feeInstallments, invoices, projectMilestones, projects } from "@/db/tables";
import { installmentStatus, isInstallmentBillable } from "@/lib/money/fee-installments";

import { createTRPCRouter, protectedProcedure } from "../init";

const amountSchema = z.number().int().min(1).max(100_000_000);
const labelSchema = z.string().trim().min(1).max(120);

async function assertOwnedProject(userId: string, projectId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
}

/** A milestone may only be linked to an installment of its own project. */
async function assertMilestoneOnProject(userId: string, projectId: string, milestoneId: string) {
  const [row] = await db
    .select({ id: projectMilestones.id })
    .from(projectMilestones)
    .where(
      and(
        eq(projectMilestones.id, milestoneId),
        eq(projectMilestones.userId, userId),
        eq(projectMilestones.projectId, projectId)
      )
    )
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found." });
}

async function getOwnedInstallment(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(feeInstallments)
    .where(and(eq(feeInstallments.id, id), eq(feeInstallments.userId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Installment not found." });
  return row;
}

function assertUnbilled(row: { invoiceId: string | null }) {
  if (row.invoiceId != null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This installment is on an invoice. Void the invoice to change it.",
    });
  }
}

/**
 * Lump-sum billing for fixed-fee projects (Spec v5 KashB2). An installment is a
 * billable piece of the fee; it becomes billable when its milestone completes or it
 * is marked ready, and is billed on a fee invoice (`invoices.acceptFee`).
 */
export const feeInstallmentsRouter = createTRPCRouter({
  /** A project's installments with their milestone and billing state. */
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx.userId, input.projectId);
      const rows = await db
        .select({
          id: feeInstallments.id,
          projectId: feeInstallments.projectId,
          label: feeInstallments.label,
          amountCents: feeInstallments.amountCents,
          milestoneId: feeInstallments.milestoneId,
          milestoneTitle: projectMilestones.title,
          milestoneCompletedAt: projectMilestones.completedAt,
          readyAt: feeInstallments.readyAt,
          invoiceId: feeInstallments.invoiceId,
          invoiceNumber: invoices.invoiceNumber,
          invoicePaidAt: invoices.paidAt,
          sortOrder: feeInstallments.sortOrder,
        })
        .from(feeInstallments)
        .leftJoin(projectMilestones, eq(feeInstallments.milestoneId, projectMilestones.id))
        .leftJoin(invoices, eq(feeInstallments.invoiceId, invoices.id))
        .where(
          and(
            eq(feeInstallments.userId, ctx.userId),
            eq(feeInstallments.projectId, input.projectId)
          )
        )
        .orderBy(asc(feeInstallments.sortOrder), asc(feeInstallments.createdAt));
      return rows.map((r) => ({ ...r, status: installmentStatus(r) }));
    }),

  /**
   * Billable-now installments grouped by client — what a fee invoice can bill.
   * Clients with nothing ready are omitted.
   */
  readyByClient: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: feeInstallments.id,
        label: feeInstallments.label,
        amountCents: feeInstallments.amountCents,
        readyAt: feeInstallments.readyAt,
        milestoneCompletedAt: projectMilestones.completedAt,
        invoiceId: feeInstallments.invoiceId,
        projectId: projects.id,
        projectName: projects.name,
        clientId: clients.id,
        clientName: clients.name,
      })
      .from(feeInstallments)
      .innerJoin(projects, eq(feeInstallments.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(projectMilestones, eq(feeInstallments.milestoneId, projectMilestones.id))
      .where(and(eq(feeInstallments.userId, ctx.userId), isNull(feeInstallments.invoiceId)))
      .orderBy(asc(projects.name), asc(feeInstallments.sortOrder));

    const byClient = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        totalCents: number;
        installments: {
          id: string;
          label: string;
          amountCents: number;
          projectId: string;
          projectName: string;
        }[];
      }
    >();
    for (const r of rows) {
      if (!isInstallmentBillable(r)) continue;
      const group = byClient.get(r.clientId) ?? {
        clientId: r.clientId,
        clientName: r.clientName,
        totalCents: 0,
        installments: [],
      };
      group.totalCents += r.amountCents;
      group.installments.push({
        id: r.id,
        label: r.label,
        amountCents: r.amountCents,
        projectId: r.projectId,
        projectName: r.projectName,
      });
      byClient.set(r.clientId, group);
    }
    return Array.from(byClient.values());
  }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        label: labelSchema,
        amountCents: amountSchema,
        milestoneId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx.userId, input.projectId);
      if (input.milestoneId) {
        await assertMilestoneOnProject(ctx.userId, input.projectId, input.milestoneId);
      }
      const [{ maxSort } = { maxSort: -1 }] = await db
        .select({ maxSort: sql<number>`coalesce(max(${feeInstallments.sortOrder}), -1)` })
        .from(feeInstallments)
        .where(
          and(
            eq(feeInstallments.userId, ctx.userId),
            eq(feeInstallments.projectId, input.projectId)
          )
        );
      const now = new Date();
      const row = {
        id: randomUUID(),
        userId: ctx.userId,
        orgId: ctx.orgId,
        projectId: input.projectId,
        label: input.label,
        amountCents: input.amountCents,
        milestoneId: input.milestoneId ?? null,
        readyAt: null,
        invoiceId: null,
        invoicedAt: null,
        sortOrder: Number(maxSort) + 1,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(feeInstallments).values(row);
      await syncFeeInstallmentRow(row.id, "insert", row);
      return row;
    }),

  /** Edit an unbilled installment. A billed one is frozen until its invoice is voided. */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        label: labelSchema.optional(),
        amountCents: amountSchema.optional(),
        milestoneId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedInstallment(ctx.userId, input.id);
      assertUnbilled(existing);
      if (input.milestoneId) {
        await assertMilestoneOnProject(ctx.userId, existing.projectId, input.milestoneId);
      }
      const patch = {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
        ...(input.milestoneId !== undefined ? { milestoneId: input.milestoneId } : {}),
        updatedAt: new Date(),
      };
      const [row] = await db
        .update(feeInstallments)
        .set(patch)
        .where(
          and(
            eq(feeInstallments.id, input.id),
            eq(feeInstallments.userId, ctx.userId),
            isNull(feeInstallments.invoiceId)
          )
        )
        .returning();
      if (!row) throw new TRPCError({ code: "CONFLICT", message: "Installment was just billed." });
      await syncFeeInstallmentRow(row.id, "update", row);
      return row;
    }),

  /** Mark ready to bill by hand (or take it back). Milestone readiness is separate. */
  setReady: protectedProcedure
    .input(z.object({ id: z.string().uuid(), ready: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedInstallment(ctx.userId, input.id);
      assertUnbilled(existing);
      const now = new Date();
      const [row] = await db
        .update(feeInstallments)
        .set({ readyAt: input.ready ? (existing.readyAt ?? now) : null, updatedAt: now })
        .where(
          and(
            eq(feeInstallments.id, input.id),
            eq(feeInstallments.userId, ctx.userId),
            isNull(feeInstallments.invoiceId)
          )
        )
        .returning();
      if (!row) throw new TRPCError({ code: "CONFLICT", message: "Installment was just billed." });
      await syncFeeInstallmentRow(row.id, "update", row);
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedInstallment(ctx.userId, input.id);
      assertUnbilled(existing);
      const deleted = await db
        .delete(feeInstallments)
        .where(
          and(
            eq(feeInstallments.id, input.id),
            eq(feeInstallments.userId, ctx.userId),
            isNull(feeInstallments.invoiceId)
          )
        )
        .returning({ id: feeInstallments.id });
      if (deleted.length === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Installment was just billed." });
      }
      await syncFeeInstallmentRow(input.id, "delete", { id: input.id });
      return { id: input.id };
    }),
});
