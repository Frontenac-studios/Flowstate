import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { nudgeEvents } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const nudgesRouter = createTRPCRouter({
  hasMorningHandoffForDate: protectedProcedure
    .input(z.object({ localDate: isoDateSchema }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ id: nudgeEvents.id })
        .from(nudgeEvents)
        .where(
          and(
            eq(nudgeEvents.userId, ctx.userId),
            eq(nudgeEvents.kind, "morning_handoff"),
            eq(nudgeEvents.localDate, input.localDate)
          )
        )
        .limit(1);
      return { seen: row != null };
    }),
  markMorningHandoffForDate: protectedProcedure
    .input(z.object({ localDate: isoDateSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        await db.insert(nudgeEvents).values({
          userId: ctx.userId,
          kind: "morning_handoff",
          localDate: input.localDate,
          taskIds: [],
        });
      } catch {
        // Unique index makes this idempotent across tabs.
      }
      return { ok: true };
    }),
});
