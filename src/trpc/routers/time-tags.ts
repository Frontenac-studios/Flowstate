import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncTimeTagRow } from "@/db/record-sync-mutation";
import { timeTags } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

const nameSchema = z.string().trim().min(1).max(80);

async function assertUniqueName(userId: string, name: string, exceptId?: string) {
  const existing = await db
    .select({ id: timeTags.id, name: timeTags.name })
    .from(timeTags)
    .where(eq(timeTags.userId, userId));
  const clash = existing.find(
    (t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== exceptId
  );
  if (clash) {
    throw new TRPCError({ code: "CONFLICT", message: `A tag named "${name}" already exists.` });
  }
}

/**
 * The controlled time-tag vocabulary (W2e). A tag is invoice structure — a typo
 * becomes a wrong invoice line — so it is managed here, not free-typed on entries.
 * Deleting a tag leaves its entries (time_entries.tag_id is ON DELETE SET NULL).
 */
export const timeTagsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({ id: timeTags.id, name: timeTags.name })
      .from(timeTags)
      .where(eq(timeTags.userId, ctx.userId))
      .orderBy(asc(timeTags.name));
  }),

  create: protectedProcedure
    .input(z.object({ name: nameSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertUniqueName(ctx.userId, input.name);
      const [row] = await db
        .insert(timeTags)
        .values({ userId: ctx.userId, orgId: ctx.orgId, name: input.name })
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create tag." });
      }
      await syncTimeTagRow(row.id, "insert", row);
      return row;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: nameSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertUniqueName(ctx.userId, input.name, input.id);
      const [row] = await db
        .update(timeTags)
        .set({ name: input.name, updatedAt: new Date() })
        .where(and(eq(timeTags.id, input.id), eq(timeTags.userId, ctx.userId)))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
      }
      await syncTimeTagRow(row.id, "update", row);
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(timeTags)
        .where(and(eq(timeTags.id, input.id), eq(timeTags.userId, ctx.userId)))
        .returning({ id: timeTags.id });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
      }
      await syncTimeTagRow(row.id, "delete", { id: row.id });
      return { id: row.id };
    }),
});
