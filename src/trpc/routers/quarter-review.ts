import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { syncDirectionRow, syncProjectRow, syncTargetRow } from "@/db/record-sync-mutation";
import { directions, projects, targets } from "@/db/tables";
import { quarterOf } from "@/lib/quarter/quarter-period";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * Applying the quarterly review (W5g, discovery §6). One atomic-ish action — "Open
 * Q<next>" — that executes every ruling the user confirmed and drafts the next
 * quarter in the same motion: retired Directions leave the board (kept in the
 * record), each bet is settled or carried, the learning track is reached or archived,
 * and a carried bet is re-opened as a fresh bet in the next quarter (the old one is
 * archived `carried`, never deleted). The draft itself is assembled client-side from
 * the existing directions/targets/learning reads; this only writes the outcome.
 */
export const quarterReviewRouter = createTRPCRouter({
  // Named `close` (not `apply`) — `apply` is a tRPC-reserved word and throws at
  // router construction.
  close: protectedProcedure
    .input(
      z.object({
        directions: z.array(
          z.object({ id: z.string().uuid(), ruling: z.enum(["keep", "retire"]) })
        ),
        targets: z.array(
          z.object({ id: z.string().uuid(), ruling: z.enum(["done", "carry", "drop"]) })
        ),
        learning: z
          .object({
            projectId: z.string().uuid(),
            ruling: z.enum(["reached", "carry", "drop"]),
          })
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const next = quarterOf(quarterOf(now).end); // end is exclusive = start of next quarter

      // Directions — retire the ruled ones; keep is a no-op (durable, carries over).
      for (const d of input.directions) {
        if (d.ruling !== "retire") continue;
        const [row] = await db
          .update(directions)
          .set({ active: false, retiredAt: now, updatedAt: now })
          .where(and(eq(directions.id, d.id), eq(directions.userId, ctx.userId)))
          .returning();
        if (row) await syncDirectionRow(row.id, "update", row);
      }

      // Targets — load first so a carry can copy the bet into the next quarter.
      const ids = input.targets.map((t) => t.id);
      const rows = ids.length
        ? await db
            .select()
            .from(targets)
            .where(and(eq(targets.userId, ctx.userId), inArray(targets.id, ids)))
        : [];
      const byId = new Map(rows.map((r) => [r.id, r]));

      let done = 0;
      let carried = 0;
      let dropped = 0;
      for (const { id, ruling } of input.targets) {
        const t = byId.get(id);
        if (!t) continue;

        if (ruling === "done") {
          const [row] = await db
            .update(targets)
            .set({ state: "met", archivedAt: t.archivedAt ?? now, updatedAt: now })
            .where(and(eq(targets.id, id), eq(targets.userId, ctx.userId)))
            .returning();
          if (row) {
            await syncTargetRow(row.id, "update", row);
            done++;
          }
        } else if (ruling === "drop") {
          const [row] = await db
            .update(targets)
            .set({ state: "dropped", archivedAt: now, updatedAt: now })
            .where(and(eq(targets.id, id), eq(targets.userId, ctx.userId)))
            .returning();
          if (row) {
            await syncTargetRow(row.id, "update", row);
            dropped++;
          }
        } else {
          // carry — archive the old bet, re-open a fresh one in the next quarter.
          const [old] = await db
            .update(targets)
            .set({ state: "carried", archivedAt: now, updatedAt: now })
            .where(and(eq(targets.id, id), eq(targets.userId, ctx.userId)))
            .returning();
          if (old) await syncTargetRow(old.id, "update", old);

          const [fresh] = await db
            .insert(targets)
            .values({
              userId: ctx.userId,
              orgId: t.orgId,
              directionId: t.directionId,
              title: t.title,
              horizon: t.horizon,
              periodStart: next.start,
              periodEnd: next.end,
              measureKind: t.measureKind,
              measureSource: t.measureSource,
              derivationKey: t.derivationKey,
              measureTarget: t.measureTarget,
              measureCurrent: null,
              state: "active",
            })
            .returning();
          if (fresh) {
            await syncTargetRow(fresh.id, "insert", fresh);
            carried++;
          }
        }
      }

      // Learning — reached stamps the terminal state; drop archives the track; carry
      // leaves it running into the next quarter.
      if (input.learning && input.learning.ruling !== "carry") {
        const { projectId, ruling } = input.learning;
        const patch =
          ruling === "reached"
            ? { reachedAt: now, updatedAt: now }
            : { archivedAt: now, updatedAt: now };
        const [row] = await db
          .update(projects)
          .set(patch)
          .where(
            and(
              eq(projects.id, projectId),
              eq(projects.userId, ctx.userId),
              eq(projects.isLearning, true)
            )
          )
          .returning();
        if (row) await syncProjectRow(row.id, "update", row);
      }

      return { nextQuarter: { year: next.year, quarter: next.quarter }, done, carried, dropped };
    }),
});
