import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncClientRow, syncRateRow } from "@/db/record-sync-mutation";
import { clients, rates } from "@/db/tables";
import { resolveRateCents, type CandidateRate } from "@/lib/rates/resolve-rate";

import { createTRPCRouter, protectedProcedure } from "../init";

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code (e.g. USD).");

async function getOwnedClient(userId: string, clientId: string) {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found." });
  }
  return row;
}

/** Most recent client-default rate (projectId null), for the list/detail summary. */
function currentDefaultRateCents(clientRates: CandidateRate[]): number | null {
  const defaults = clientRates
    .filter((rate) => rate.projectId === null && rate.effectiveFrom.getTime() <= Date.now())
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  return defaults[0]?.amountCents ?? null;
}

export const clientsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(clients.userId, ctx.userId)];
      if (!input?.includeArchived) conditions.push(isNull(clients.archivedAt));

      const [clientRows, rateRows] = await Promise.all([
        db
          .select()
          .from(clients)
          .where(and(...conditions))
          .orderBy(desc(clients.updatedAt)),
        db
          .select({
            clientId: rates.clientId,
            projectId: rates.projectId,
            amountCents: rates.amountCents,
            effectiveFrom: rates.effectiveFrom,
          })
          .from(rates)
          .where(eq(rates.userId, ctx.userId)),
      ]);

      const ratesByClient = new Map<string, CandidateRate[]>();
      for (const rate of rateRows) {
        const list = ratesByClient.get(rate.clientId) ?? [];
        list.push({
          projectId: rate.projectId,
          amountCents: rate.amountCents,
          effectiveFrom: rate.effectiveFrom,
        });
        ratesByClient.set(rate.clientId, list);
      }

      return clientRows.map((client) => ({
        ...client,
        defaultRateCents: currentDefaultRateCents(ratesByClient.get(client.id) ?? []),
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const client = await getOwnedClient(ctx.userId, input.id);
      const rateRows = await db
        .select()
        .from(rates)
        .where(and(eq(rates.userId, ctx.userId), eq(rates.clientId, input.id)))
        .orderBy(desc(rates.effectiveFrom));

      return {
        ...client,
        rates: rateRows,
        defaultRateCents: currentDefaultRateCents(
          rateRows.map((r) => ({
            projectId: r.projectId,
            amountCents: r.amountCents,
            effectiveFrom: r.effectiveFrom,
          }))
        ),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(160),
        currency: currencySchema.optional(),
        notes: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(clients)
        .values({
          userId: ctx.userId,
          orgId: ctx.orgId,
          name: input.name,
          currency: input.currency ?? "USD",
          notes: input.notes ?? null,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create client." });
      }

      await syncClientRow(row.id, "insert", row);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(160).optional(),
        currency: currencySchema.optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedClient(ctx.userId, input.id);

      const patch: Partial<typeof clients.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.currency !== undefined) patch.currency = input.currency;
      if (input.notes !== undefined) patch.notes = input.notes;

      const [row] = await db
        .update(clients)
        .set(patch)
        .where(and(eq(clients.id, input.id), eq(clients.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update client." });
      }

      await syncClientRow(row.id, "update", row);
      return row;
    }),

  /**
   * Set a rate by appending a new rate row rather than mutating an existing one,
   * so the rate's history survives. `projectId` null = the client's default rate;
   * set = a rate that applies to one project only. Resolution (project beats
   * client) lives in resolveRateCents, not here.
   */
  setRate: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        projectId: z.string().uuid().nullable().optional(),
        amountCents: z.number().int().min(0).max(100_000_00),
        effectiveFrom: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedClient(ctx.userId, input.clientId);

      const [row] = await db
        .insert(rates)
        .values({
          userId: ctx.userId,
          orgId: ctx.orgId,
          clientId: input.clientId,
          projectId: input.projectId ?? null,
          amountCents: input.amountCents,
          effectiveFrom: input.effectiveFrom ?? new Date(),
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to set rate." });
      }

      await syncRateRow(row.id, "insert", row);
      return row;
    }),

  /** Rate resolution for a project, exposed for the UI. Throws if none resolves. */
  resolveProjectRate: protectedProcedure
    .input(z.object({ clientId: z.string().uuid(), projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rateRows = await db
        .select({
          projectId: rates.projectId,
          amountCents: rates.amountCents,
          effectiveFrom: rates.effectiveFrom,
        })
        .from(rates)
        .where(and(eq(rates.userId, ctx.userId), eq(rates.clientId, input.clientId)));

      const amountCents = resolveRateCents(input.projectId, rateRows);
      return { amountCents };
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedClient(ctx.userId, input.id);

      const [row] = await db
        .update(clients)
        .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(clients.id, input.id), eq(clients.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive client.",
        });
      }

      await syncClientRow(row.id, "update", row);
      return { id: row.id };
    }),

  unarchive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedClient(ctx.userId, input.id);

      const [row] = await db
        .update(clients)
        .set({ status: "active", archivedAt: null, updatedAt: new Date() })
        .where(and(eq(clients.id, input.id), eq(clients.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unarchive client.",
        });
      }

      await syncClientRow(row.id, "update", row);
      return { id: row.id };
    }),
});
