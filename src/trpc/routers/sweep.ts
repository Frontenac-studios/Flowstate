import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { abyssItems, projects, targets, tasks, timeEntries } from "@/db/tables";
import {
  syncAbyssItemRow,
  syncProjectRow,
  syncTargetRow,
  syncTaskRow,
} from "@/db/record-sync-mutation";
import { computeSweep, SWEEP_KEEP_DAYS, type SweepCandidate } from "@/lib/sweep/sweep";

import { createTRPCRouter, protectedProcedure } from "../init";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Latest of two possibly-null dates, or `fallback` when both are null. */
function latest(a: Date | null, b: Date | null, fallback: Date): Date {
  const candidates = [a, b].filter((d): d is Date => d != null);
  if (candidates.length === 0) return fallback;
  return candidates.reduce((max, d) => (d.getTime() > max.getTime() ? d : max));
}

/**
 * W7 — the Sweep. The weekly ritual: read what has gone quiet at three altitudes,
 * rule each drop / park / keep. `draft` gathers the stale candidates (each altitude
 * has its own "last activity" signal) and hands them to the pure `computeSweep`;
 * `close` applies a batch of rulings across the three entity types, syncing each
 * write. Named `close` (not `apply`, which tRPC reserves), mirroring quarterReview.
 */
export const sweepRouter = createTRPCRouter({
  draft: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();

    // Last logged time per task and per project (one pass over the user's entries —
    // the same aggregate-in-JS convention the time reports use, so pg and the SQLite
    // mirror share behaviour).
    const entries = await db
      .select({
        taskId: timeEntries.taskId,
        projectId: timeEntries.projectId,
        startedAt: timeEntries.startedAt,
      })
      .from(timeEntries)
      .where(eq(timeEntries.userId, ctx.userId));
    const lastLoggedByTask = new Map<string, Date>();
    const lastLoggedByProject = new Map<string, Date>();
    for (const entry of entries) {
      if (entry.taskId) {
        const prev = lastLoggedByTask.get(entry.taskId);
        if (!prev || entry.startedAt > prev) lastLoggedByTask.set(entry.taskId, entry.startedAt);
      }
      const prevP = lastLoggedByProject.get(entry.projectId);
      if (!prevP || entry.startedAt > prevP)
        lastLoggedByProject.set(entry.projectId, entry.startedAt);
    }

    // Tasks: incomplete. "Untouched" = the later of its last edit and its last logged
    // time (logging time does not bump tasks.updated_at, so both are needed).
    const taskRows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        updatedAt: tasks.updatedAt,
        sweptKeptUntil: tasks.sweptKeptUntil,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, ctx.userId), isNull(tasks.completedAt)));

    // Projects: active, on the board, not the personal Maintenance project. "No time
    // logged" measures from the last entry, or from creation when none exists.
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
        sweptKeptUntil: projects.sweptKeptUntil,
      })
      .from(projects)
      .where(
        and(
          eq(projects.userId, ctx.userId),
          eq(projects.state, "active"),
          isNull(projects.archivedAt),
          eq(projects.isMaintenance, false)
        )
      );

    // Targets: active MANUAL bets in their current period. Auto bets carry no stored
    // movement history (money is derived at read), so they are out of the Sweep.
    const targetRows = await db
      .select({
        id: targets.id,
        title: targets.title,
        updatedAt: targets.updatedAt,
        sweptKeptUntil: targets.sweptKeptUntil,
      })
      .from(targets)
      .where(
        and(
          eq(targets.userId, ctx.userId),
          eq(targets.state, "active"),
          isNull(targets.archivedAt),
          eq(targets.measureSource, "manual"),
          lte(targets.periodStart, now),
          gt(targets.periodEnd, now)
        )
      );

    const candidates: SweepCandidate[] = [
      ...taskRows.map((t) => ({
        altitude: "task" as const,
        id: t.id,
        title: t.title,
        lastActivityAt: latest(t.updatedAt, lastLoggedByTask.get(t.id) ?? null, t.updatedAt),
        keptUntil: t.sweptKeptUntil,
      })),
      ...projectRows.map((p) => ({
        altitude: "project" as const,
        id: p.id,
        title: p.name,
        lastActivityAt: lastLoggedByProject.get(p.id) ?? p.createdAt,
        keptUntil: p.sweptKeptUntil,
      })),
      ...targetRows.map((t) => ({
        altitude: "target" as const,
        id: t.id,
        title: t.title,
        lastActivityAt: t.updatedAt,
        keptUntil: t.sweptKeptUntil,
      })),
    ];

    return computeSweep({ candidates, now });
  }),

  /**
   * Apply a batch of rulings. keep → won't resurface for ~a month; drop → gone
   * (task deleted; project/target archived off the board, retrievable); park →
   * task to the Backlog, project paused. Targets take keep/drop only.
   */
  close: protectedProcedure
    .input(
      z.object({
        rulings: z
          .array(
            z.object({
              altitude: z.enum(["task", "project", "target"]),
              id: z.string().uuid(),
              ruling: z.enum(["drop", "park", "keep"]),
            })
          )
          .max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const keptUntil = new Date(now.getTime() + SWEEP_KEEP_DAYS * DAY_MS);
      const counts = { dropped: 0, parked: 0, kept: 0 };

      for (const r of input.rulings) {
        if (r.altitude === "task") {
          if (r.ruling === "keep") {
            const [row] = await db
              .update(tasks)
              .set({ sweptKeptUntil: keptUntil, updatedAt: now })
              .where(and(eq(tasks.id, r.id), eq(tasks.userId, ctx.userId)))
              .returning();
            if (row) {
              await syncTaskRow(row.id, "update", row);
              counts.kept += 1;
            }
          } else if (r.ruling === "drop") {
            const deleted = await db
              .delete(tasks)
              .where(and(eq(tasks.id, r.id), eq(tasks.userId, ctx.userId)))
              .returning({ id: tasks.id });
            if (deleted.length > 0) {
              await syncTaskRow(r.id, "delete", { id: r.id, userId: ctx.userId });
              counts.dropped += 1;
            }
          } else {
            // park → move to the Backlog (mirrors abyss.dropFromTask).
            const [task] = await db
              .select()
              .from(tasks)
              .where(and(eq(tasks.id, r.id), eq(tasks.userId, ctx.userId)))
              .limit(1);
            if (!task) continue;
            const [parked] = await db
              .insert(abyssItems)
              .values({
                userId: ctx.userId,
                title: task.title,
                type: "task",
                category: task.categoryUnresolved ? null : task.category,
                source: "drop",
                lastTouchedAt: now,
              })
              .returning();
            if (parked) await syncAbyssItemRow(parked.id, "insert", parked);
            await db.delete(tasks).where(and(eq(tasks.id, r.id), eq(tasks.userId, ctx.userId)));
            await syncTaskRow(r.id, "delete", { id: r.id, userId: ctx.userId });
            counts.parked += 1;
          }
        } else if (r.altitude === "project") {
          const patch =
            r.ruling === "keep"
              ? { sweptKeptUntil: keptUntil, updatedAt: now }
              : r.ruling === "drop"
                ? { archivedAt: now, updatedAt: now }
                : { state: "paused" as const, updatedAt: now };
          const [row] = await db
            .update(projects)
            .set(patch)
            .where(and(eq(projects.id, r.id), eq(projects.userId, ctx.userId)))
            .returning();
          if (row) {
            await syncProjectRow(row.id, "update", row);
            if (r.ruling === "keep") counts.kept += 1;
            else if (r.ruling === "drop") counts.dropped += 1;
            else counts.parked += 1;
          }
        } else {
          // target — keep or drop only; there is no Backlog home for a bet.
          if (r.ruling === "park") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A target cannot be parked — keep or drop it.",
            });
          }
          const patch =
            r.ruling === "keep"
              ? { sweptKeptUntil: keptUntil, updatedAt: now }
              : { state: "dropped" as const, archivedAt: now, updatedAt: now };
          const [row] = await db
            .update(targets)
            .set(patch)
            .where(and(eq(targets.id, r.id), eq(targets.userId, ctx.userId)))
            .returning();
          if (row) {
            await syncTargetRow(row.id, "update", row);
            if (r.ruling === "keep") counts.kept += 1;
            else counts.dropped += 1;
          }
        }
      }

      return counts;
    }),
});
