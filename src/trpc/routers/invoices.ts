import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { runAppTransaction } from "@/db/run-transaction";
import { syncInvoiceLineRow, syncInvoiceRow } from "@/db/record-sync-mutation";
import {
  clients,
  invoiceLines,
  invoices,
  moneySettings,
  projects,
  rates,
  tasks,
  timeEntries,
} from "@/db/tables";
import {
  buildInvoiceDraft,
  lineAmountCents,
  roundToQuarterSeconds,
  type UnbilledEntry,
} from "@/lib/invoice/build-invoice-draft";
import { draftInvoiceLineItems } from "@/server/invoice/draft-line-items";

import { createTRPCRouter, protectedProcedure } from "../init";

const SECONDS_PER_HOUR = 3600;

/** Exact seconds between start and end (or now, for a still-running entry). */
function entrySeconds(startedAt: Date, endedAt: Date | null, now: Date): number {
  return Math.max(0, Math.floor(((endedAt ?? now).getTime() - startedAt.getTime()) / 1000));
}

/** The client's current default rate in cents/hour, or null if none is set. */
async function resolveClientRateCents(userId: string, clientId: string): Promise<number | null> {
  const rows = await db
    .select({ amountCents: rates.amountCents, effectiveFrom: rates.effectiveFrom })
    .from(rates)
    .where(and(eq(rates.userId, userId), eq(rates.clientId, clientId), isNull(rates.projectId)));
  const now = Date.now();
  const effective = rows
    .filter((r) => r.effectiveFrom.getTime() <= now)
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  return effective[0]?.amountCents ?? null;
}

async function getOwnedClient(userId: string, clientId: string) {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found." });
  return row;
}

/** Unbilled, billable, completed entries for one client — the invoice pool. */
async function fetchUnbilledEntries(userId: string, clientId: string) {
  return db
    .select({
      id: timeEntries.id,
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
      taskId: timeEntries.taskId,
      description: timeEntries.description,
      taskTitle: tasks.title,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .where(
      and(
        eq(timeEntries.userId, userId),
        eq(projects.clientId, clientId),
        eq(timeEntries.billable, true),
        isNull(timeEntries.invoiceId),
        isNotNull(timeEntries.endedAt)
      )
    );
}

function toUnbilledEntry(
  row: {
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    taskId: string | null;
    description: string | null;
    taskTitle: string | null;
  },
  now: Date
): UnbilledEntry {
  return {
    id: row.id,
    startedAt: row.startedAt,
    seconds: entrySeconds(row.startedAt, row.endedAt, now),
    taskId: row.taskId,
    label: row.description?.trim() || row.taskTitle?.trim() || "(no description)",
  };
}

const lineInput = z.object({
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  billedSeconds: z.number().int().min(0),
  sortOrder: z.number().int().min(0),
  isAdditional: z.boolean(),
});

export const invoicesRouter = createTRPCRouter({
  /**
   * Which clients have unbilled billable time, and whether they've crossed their
   * threshold. Drives the Money "Ready to bill" list — the threshold-primary
   * trigger (a monthly backstop sweep is any client shown here under threshold).
   */
  readyToBill: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const [clientRows, entryRows] = await Promise.all([
      db
        .select({
          id: clients.id,
          name: clients.name,
          thresholdHours: clients.billingThresholdHours,
        })
        .from(clients)
        .where(and(eq(clients.userId, ctx.userId), isNull(clients.archivedAt))),
      db
        .select({
          clientId: projects.clientId,
          startedAt: timeEntries.startedAt,
          endedAt: timeEntries.endedAt,
        })
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .where(
          and(
            eq(timeEntries.userId, ctx.userId),
            eq(timeEntries.billable, true),
            isNull(timeEntries.invoiceId),
            isNotNull(timeEntries.endedAt)
          )
        ),
    ]);

    const unbilledByClient = new Map<string, number>();
    for (const e of entryRows) {
      if (!e.clientId) continue;
      unbilledByClient.set(
        e.clientId,
        (unbilledByClient.get(e.clientId) ?? 0) + entrySeconds(e.startedAt, e.endedAt, now)
      );
    }

    return clientRows
      .map((c) => {
        const unbilledSeconds = unbilledByClient.get(c.id) ?? 0;
        return {
          clientId: c.id,
          name: c.name,
          thresholdHours: c.thresholdHours,
          unbilledSeconds,
          atThreshold: unbilledSeconds >= c.thresholdHours * SECONDS_PER_HOUR,
        };
      })
      .filter((c) => c.unbilledSeconds > 0)
      .sort((a, b) =>
        a.atThreshold !== b.atThreshold
          ? a.atThreshold
            ? -1
            : 1
          : b.unbilledSeconds - a.unbilledSeconds
      );
  }),

  /**
   * Compute a draft invoice for a client (product law 1 — a draft, nothing written).
   * A mutation, not a query, because it is an explicit action that calls the model
   * for the line-item wording. The numbers come from the deterministic engine; the
   * AI only writes labels and descriptions.
   */
  draft: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const client = await getOwnedClient(ctx.userId, input.clientId);

      const rateCents = await resolveClientRateCents(ctx.userId, input.clientId);
      if (rateCents == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Set a rate for ${client.name} before drafting an invoice.`,
        });
      }

      const rows = await fetchUnbilledEntries(ctx.userId, input.clientId);
      const entries = rows.map((r) => toUnbilledEntry(r, now));

      const draft = buildInvoiceDraft({
        entries,
        thresholdSeconds: client.billingThresholdHours * SECONDS_PER_HOUR,
        rateCents,
      });

      const wording = await draftInvoiceLineItems({
        clientName: client.name,
        lines: draft.lines.map((l) => ({
          index: l.sortOrder,
          seedLabel: l.seedLabel,
          rawLabels: l.rawLabels,
          hours: l.billedSeconds / SECONDS_PER_HOUR,
          isAdditional: l.isAdditional,
        })),
      });
      const wordingByIndex = new Map(wording.map((w) => [w.index, w]));

      // Period = the span of the entries this draft actually bills.
      const billedSet = new Set(draft.billedEntryIds);
      const billedRows = rows.filter((r) => billedSet.has(r.id));
      const periodStart = billedRows.reduce<Date | null>(
        (min, r) => (min == null || r.startedAt < min ? r.startedAt : min),
        null
      );
      const periodEnd = billedRows.reduce<Date | null>(
        (max, r) => (r.endedAt && (max == null || r.endedAt > max) ? r.endedAt : max),
        null
      );

      const [settings] = await db
        .select({ taxReservePercent: moneySettings.taxReservePercent })
        .from(moneySettings)
        .where(eq(moneySettings.userId, ctx.userId))
        .limit(1);
      const taxReservePercentBps = settings?.taxReservePercent ?? null;
      const taxReserveCents =
        taxReservePercentBps != null
          ? Math.round((draft.amountCents * taxReservePercentBps) / 10000)
          : null;

      const [{ maxNumber } = { maxNumber: 0 }] = await db
        .select({ maxNumber: sql<number>`coalesce(max(${invoices.invoiceNumber}), 0)` })
        .from(invoices)
        .where(and(eq(invoices.userId, ctx.userId), eq(invoices.clientId, input.clientId)));

      return {
        clientId: input.clientId,
        clientName: client.name,
        currency: client.currency,
        invoiceNumber: Number(maxNumber) + 1,
        rateCents,
        thresholdHours: client.billingThresholdHours,
        periodStart: periodStart ?? now,
        periodEnd: periodEnd ?? now,
        billedSeconds: draft.billedSecondsRounded,
        billedSecondsExact: draft.billedSecondsExact,
        carriedSeconds: draft.carriedSecondsExact,
        amountCents: draft.amountCents,
        atThreshold: draft.atThreshold,
        taxReservePercentBps,
        taxReserveCents,
        billedEntryIds: draft.billedEntryIds,
        lines: draft.lines.map((l) => ({
          label: wordingByIndex.get(l.sortOrder)?.label ?? l.seedLabel,
          description: wordingByIndex.get(l.sortOrder)?.description ?? "",
          billedSeconds: l.billedSeconds,
          amountCents: l.amountCents,
          sortOrder: l.sortOrder,
          isAdditional: l.isAdditional,
        })),
      };
    }),

  /**
   * Commit a reviewed draft. The double-bill guard is a pre-check plus a conditional
   * UPDATE stamping `invoice_id` only where still null: if any billed entry was
   * already billed or changed, acceptance fails and (on Postgres) rolls back.
   */
  accept: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        billedEntryIds: z.array(z.string().uuid()).min(1),
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
        note: z.string().trim().max(1000).optional(),
        lines: z.array(lineInput).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const client = await getOwnedClient(ctx.userId, input.clientId);

      const rateCents = await resolveClientRateCents(ctx.userId, input.clientId);
      if (rateCents == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Set a rate for ${client.name} before billing.`,
        });
      }

      // Pre-check: every requested entry must still be unbilled, billable, and this
      // client's. Anything else means the draft went stale — refuse rather than bill.
      const stillBillable = await db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .where(
          and(
            eq(timeEntries.userId, ctx.userId),
            eq(projects.clientId, input.clientId),
            eq(timeEntries.billable, true),
            isNull(timeEntries.invoiceId),
            isNotNull(timeEntries.endedAt),
            inArray(timeEntries.id, input.billedEntryIds)
          )
        );
      if (stillBillable.length !== input.billedEntryIds.length) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Some entries were already billed or changed. Re-draft the invoice.",
        });
      }

      // Recompute money server-side — the rate and per-line amount are never trusted
      // from the client; only labels, descriptions, and edited hours are.
      const pricedLines = input.lines
        .map((l) => {
          const rounded = roundToQuarterSeconds(l.billedSeconds);
          return {
            label: l.label,
            description: l.description,
            billedSeconds: rounded,
            amountCents: lineAmountCents(rounded, rateCents),
            sortOrder: l.sortOrder,
          };
        })
        .filter((l) => l.billedSeconds > 0);
      if (pricedLines.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invoice needs at least one line.",
        });
      }
      const billedSeconds = pricedLines.reduce((s, l) => s + l.billedSeconds, 0);
      const amountCents = pricedLines.reduce((s, l) => s + l.amountCents, 0);

      // Carry-forward snapshot: unbilled billable seconds NOT on this invoice.
      const remainingRows = await fetchUnbilledEntries(ctx.userId, input.clientId);
      const billedSet = new Set(input.billedEntryIds);
      const carriedSeconds = remainingRows
        .filter((r) => !billedSet.has(r.id))
        .reduce((s, r) => s + entrySeconds(r.startedAt, r.endedAt, now), 0);

      const [{ maxNumber } = { maxNumber: 0 }] = await db
        .select({ maxNumber: sql<number>`coalesce(max(${invoices.invoiceNumber}), 0)` })
        .from(invoices)
        .where(and(eq(invoices.userId, ctx.userId), eq(invoices.clientId, input.clientId)));
      const invoiceNumber = Number(maxNumber) + 1;

      const invoiceId = randomUUID();
      const invoiceRow = {
        id: invoiceId,
        userId: ctx.userId,
        orgId: ctx.orgId,
        clientId: input.clientId,
        invoiceNumber,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        thresholdHours: client.billingThresholdHours,
        rateCents,
        billedSeconds,
        carriedSeconds,
        amountCents,
        status: "accepted",
        note: input.note ?? null,
      };
      const lineRows = pricedLines.map((l) => ({
        id: randomUUID(),
        userId: ctx.userId,
        orgId: ctx.orgId,
        invoiceId,
        label: l.label,
        description: l.description,
        billedSeconds: l.billedSeconds,
        amountCents: l.amountCents,
        sortOrder: l.sortOrder,
      }));

      await runAppTransaction(async (tx) => {
        await tx.insert(invoices).values(invoiceRow);
        await tx.insert(invoiceLines).values(lineRows);

        const stamped = await tx
          .update(timeEntries)
          .set({ invoiceId, invoicedAt: now, updatedAt: now })
          .where(
            and(
              eq(timeEntries.userId, ctx.userId),
              inArray(timeEntries.id, input.billedEntryIds),
              isNull(timeEntries.invoiceId)
            )
          )
          .returning({ id: timeEntries.id });

        // The guarantee: an entry already carrying an invoice id is untouched, so a
        // short count means a concurrent bill slipped in — abort (Postgres rolls back).
        if (stamped.length !== input.billedEntryIds.length) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An entry was billed concurrently. Re-draft the invoice.",
          });
        }
      });

      await syncInvoiceRow(invoiceId, "insert", invoiceRow);
      for (const line of lineRows) await syncInvoiceLineRow(line.id, "insert", line);

      return { invoiceId, invoiceNumber, amountCents, billedSeconds, carriedSeconds };
    }),

  /** Un-accept: void the invoice and release its entries to be billed again. */
  void: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, input.invoiceId), eq(invoices.userId, ctx.userId)))
        .limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found." });
      if (invoice.status === "void") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice is already void." });
      }

      const now = new Date();
      const voided = { ...invoice, status: "void", voidedAt: now, updatedAt: now };

      await runAppTransaction(async (tx) => {
        await tx
          .update(timeEntries)
          .set({ invoiceId: null, invoicedAt: null, updatedAt: now })
          .where(
            and(eq(timeEntries.userId, ctx.userId), eq(timeEntries.invoiceId, input.invoiceId))
          );
        await tx
          .update(invoices)
          .set({ status: "void", voidedAt: now, updatedAt: now })
          .where(and(eq(invoices.id, input.invoiceId), eq(invoices.userId, ctx.userId)));
      });

      await syncInvoiceRow(input.invoiceId, "update", voided);
      return { invoiceId: input.invoiceId };
    }),

  /** Record that a client paid (the "collected" signal) — or undo it. */
  markPaid: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid(), paidAt: z.coerce.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [row] = await db
        .update(invoices)
        .set({ paidAt: input.paidAt ?? now, updatedAt: now })
        .where(
          and(
            eq(invoices.id, input.invoiceId),
            eq(invoices.userId, ctx.userId),
            eq(invoices.status, "accepted")
          )
        )
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found." });
      await syncInvoiceRow(row.id, "update", row);
      return { invoiceId: row.id, paidAt: row.paidAt };
    }),

  markUnpaid: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [row] = await db
        .update(invoices)
        .set({ paidAt: null, updatedAt: now })
        .where(and(eq(invoices.id, input.invoiceId), eq(invoices.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found." });
      await syncInvoiceRow(row.id, "update", row);
      return { invoiceId: row.id };
    }),

  /** Invoice history, newest first, with client name. */
  list: protectedProcedure
    .input(z.object({ clientId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(invoices.userId, ctx.userId)];
      if (input?.clientId) conditions.push(eq(invoices.clientId, input.clientId));
      return db
        .select({
          id: invoices.id,
          clientId: invoices.clientId,
          clientName: clients.name,
          invoiceNumber: invoices.invoiceNumber,
          periodStart: invoices.periodStart,
          periodEnd: invoices.periodEnd,
          billedSeconds: invoices.billedSeconds,
          carriedSeconds: invoices.carriedSeconds,
          amountCents: invoices.amountCents,
          status: invoices.status,
          paidAt: invoices.paidAt,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt));
    }),

  /** One invoice with its lines and client — for re-exporting Markdown / CSV. */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [invoice] = await db
        .select({
          id: invoices.id,
          clientId: invoices.clientId,
          clientName: clients.name,
          invoiceNumber: invoices.invoiceNumber,
          periodStart: invoices.periodStart,
          periodEnd: invoices.periodEnd,
          rateCents: invoices.rateCents,
          billedSeconds: invoices.billedSeconds,
          carriedSeconds: invoices.carriedSeconds,
          amountCents: invoices.amountCents,
          status: invoices.status,
          paidAt: invoices.paidAt,
          note: invoices.note,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(eq(invoices.id, input.id), eq(invoices.userId, ctx.userId)))
        .limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found." });

      const lines = await db
        .select({
          label: invoiceLines.label,
          description: invoiceLines.description,
          billedSeconds: invoiceLines.billedSeconds,
          amountCents: invoiceLines.amountCents,
          sortOrder: invoiceLines.sortOrder,
        })
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, input.id))
        .orderBy(invoiceLines.sortOrder);

      return { ...invoice, lines };
    }),
});
