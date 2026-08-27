import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncProjectRow } from "@/db/record-sync-mutation";
import { projects, timeEntries } from "@/db/tables";
import { slugifyProjectName } from "@/lib/projects/slugify";
import { quarterOf } from "@/lib/quarter/quarter-period";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * The learning roadmap (W5, discovery §13 Q7). Learning is not its own table — it
 * is a business, non-client project flagged `is_learning`, with a `capability`
 * (the statement) and a `why`. Milestones reuse project phases; logged time is
 * ordinary project time, shown as context with no hours quota. Exactly one track
 * is active at a time (not reached, not archived).
 *
 * "Capability reached" (`reachedAt`) is the terminal state, ruled on at the
 * quarterly review (W5g) or set here.
 */

/** The one active learning project: flagged, not reached, not archived. */
async function activeLearning(userId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.isLearning, true),
        isNull(projects.reachedAt),
        isNull(projects.archivedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export const learningRouter = createTRPCRouter({
  /** The active learning track with its logged-time context for the quarter, or null. */
  get: protectedProcedure.query(async ({ ctx }) => {
    const track = await activeLearning(ctx.userId);
    if (!track) return null;

    const q = quarterOf(new Date());
    const now = new Date();
    const entries = await db
      .select({ startedAt: timeEntries.startedAt, endedAt: timeEntries.endedAt })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, ctx.userId),
          eq(timeEntries.projectId, track.id),
          gte(timeEntries.startedAt, q.start),
          lt(timeEntries.startedAt, q.end)
        )
      );

    const loggedSeconds = entries.reduce(
      (sum, e) =>
        sum +
        Math.max(0, Math.floor(((e.endedAt ?? now).getTime() - e.startedAt.getTime()) / 1000)),
      0
    );

    return {
      projectId: track.id,
      slug: track.slug,
      capability: track.capability ?? track.name,
      why: track.why,
      reachedAt: track.reachedAt,
      loggedSeconds,
    };
  }),

  /** Start a learning track — a business project. Rejects a second active one (cap 1). */
  create: protectedProcedure
    .input(
      z.object({
        capability: z.string().trim().min(1).max(120),
        why: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (await activeLearning(ctx.userId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You already have an active learning track. Reach or drop it before starting another.",
        });
      }

      const slug = slugifyProjectName(input.capability).toLowerCase();
      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), eq(projects.slug, slug)))
        .limit(1);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A project with this slug already exists.",
        });
      }

      const [row] = await db
        .insert(projects)
        .values({
          userId: ctx.userId,
          name: input.capability.trim(),
          slug,
          category: "business",
          clientId: null,
          state: "active",
          isLearning: true,
          capability: input.capability.trim(),
          why: input.why?.trim() || null,
        })
        .returning();
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start learning track.",
        });
      }

      await syncProjectRow(row.id, "insert", row);
      return { projectId: row.id };
    }),

  /** Edit the capability statement or the "why". */
  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        capability: z.string().trim().min(1).max(120).optional(),
        why: z.string().trim().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (input.capability !== undefined) {
        patch.capability = input.capability;
        patch.name = input.capability;
      }
      if (input.why !== undefined) patch.why = input.why;

      const [row] = await db
        .update(projects)
        .set(patch)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.userId),
            eq(projects.isLearning, true)
          )
        )
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Learning track not found." });
      }

      await syncProjectRow(row.id, "update", row);
      return { projectId: row.id };
    }),

  /** Set or clear the terminal "capability reached" state. */
  setReached: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), reached: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(projects)
        .set({ reachedAt: input.reached ? new Date() : null, updatedAt: new Date() })
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.userId),
            eq(projects.isLearning, true)
          )
        )
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Learning track not found." });
      }

      await syncProjectRow(row.id, "update", row);
      return { projectId: row.id };
    }),
});
