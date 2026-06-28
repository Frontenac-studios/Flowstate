import { and, desc, eq, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncAbyssItemRow } from "@/db/record-sync-mutation";
import { abyssItems } from "@/db/tables";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";

import { createTRPCRouter, protectedProcedure } from "../init";

const categorySchema = z.enum(PROJECT_CATEGORIES);
const typeSchema = z.enum(["idea", "task"]);
const sourceSchema = z.enum(["capture", "drop"]);

export const abyssRouter = createTRPCRouter({
  /** Everything still in the deep (archived items are retrievable separately, slice 8). */
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(abyssItems)
      .where(and(eq(abyssItems.userId, ctx.userId), ne(abyssItems.status, "archived")))
      .orderBy(desc(abyssItems.lastTouchedAt));
  }),

  /** Capture an item. `source` distinguishes quick/chat capture from a triage Drop. */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        type: typeSchema.default("idea"),
        category: categorySchema.nullish(),
        note: z.string().max(2000).nullish(),
        source: sourceSchema.default("capture"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [row] = await db
        .insert(abyssItems)
        .values({
          userId: ctx.userId,
          title: input.title.trim(),
          type: input.type,
          category: input.category ?? null,
          note: input.note?.trim() || null,
          source: input.source,
          lastTouchedAt: now,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to capture the item.",
        });
      }

      await syncAbyssItemRow(row.id, "insert", row);
      return row;
    }),

  /** Explicit per-item hard delete — the only true removal (§6 lifecycle). */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ id: abyssItems.id })
        .from(abyssItems)
        .where(and(eq(abyssItems.id, input.id), eq(abyssItems.userId, ctx.userId)))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });
      }

      await db
        .delete(abyssItems)
        .where(and(eq(abyssItems.id, input.id), eq(abyssItems.userId, ctx.userId)));

      await syncAbyssItemRow(input.id, "delete", { id: input.id, userId: ctx.userId });
      return { id: input.id };
    }),
});
