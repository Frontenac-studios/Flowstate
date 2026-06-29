import { and, desc, eq, inArray, isNull, like, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import {
  syncAbyssItemRow,
  syncPlanningRow,
  syncProjectRow,
  syncTaskRow,
} from "@/db/record-sync-mutation";
import { abyssItems, goals, projects, tasks } from "@/db/tables";
import {
  encodePromotedTarget,
  isTaskLaneTarget,
  scheduledDateForLane,
  selectCameBack,
} from "@/lib/abyss/promotion";
import { selectNearDuplicates } from "@/lib/abyss/resurface";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import { slugifyProjectName } from "@/lib/projects/slugify";
import {
  resolveTaskCategoryForUser,
  setLastUsedCategory,
} from "@/server/tasks/resolve-task-category";

import { createTRPCRouter, protectedProcedure } from "../init";

const categorySchema = z.enum(PROJECT_CATEGORIES);
const typeSchema = z.enum(["idea", "task"]);
const sourceSchema = z.enum(["capture", "drop"]);
const targetSchema = z.enum(["today", "week", "project", "goal"]);

/** A free project slug for the user, disambiguating collisions with a numeric suffix. */
async function uniqueProjectSlug(userId: string, name: string): Promise<string> {
  const base = slugifyProjectName(name);
  const existing = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        or(eq(projects.slug, base), like(projects.slug, `${base}-%`))
      )
    );
  const taken = new Set(existing.map((r) => r.slug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

/**
 * Quiet "it came back": flip promoted task-lane items whose spawned task is completed
 * or abandoned back to `active`, counting the return as a resurface (§6 lifecycle).
 * Returns true when anything changed so the caller can re-read. Project/goal promotions
 * never auto-return.
 */
async function reconcileCameBack(
  userId: string,
  rows: (typeof abyssItems.$inferSelect)[]
): Promise<boolean> {
  const candidates = rows.filter(
    (r) => r.status === "promoted" && isTaskLaneTarget(r.promotedTarget)
  );
  if (candidates.length === 0) return false;

  const taskIds = candidates.map((r) => r.promotedTaskId).filter((id): id is string => id !== null);
  const taskRows = taskIds.length
    ? await db
        .select({ id: tasks.id, completedAt: tasks.completedAt })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
    : [];
  const tasksById = new Map(taskRows.map((t) => [t.id, t]));

  const cameBackIds = selectCameBack(candidates, tasksById);
  if (cameBackIds.length === 0) return false;

  const now = new Date();
  for (const id of cameBackIds) {
    const [updated] = await db
      .update(abyssItems)
      .set({
        status: "active",
        promotedTaskId: null,
        promotedTarget: null,
        resurfaceCount: sql`${abyssItems.resurfaceCount} + 1`,
        lastResurfacedAt: now,
        lastTouchedAt: now,
        updatedAt: now,
      })
      .where(and(eq(abyssItems.id, id), eq(abyssItems.userId, userId)))
      .returning();
    if (updated) await syncAbyssItemRow(updated.id, "update", updated);
  }
  return true;
}

export const abyssRouter = createTRPCRouter({
  /** Everything still in the deep (archived items are retrievable separately, slice 8). */
  list: protectedProcedure.query(async ({ ctx }) => {
    const query = () =>
      db
        .select()
        .from(abyssItems)
        .where(and(eq(abyssItems.userId, ctx.userId), ne(abyssItems.status, "archived")))
        .orderBy(desc(abyssItems.lastTouchedAt));

    const rows = await query();
    const changed = await reconcileCameBack(ctx.userId, rows);
    return changed ? query() : rows;
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

  /**
   * Store a title's embedding, computed client-side (the model never runs server-side —
   * §7A). Sets the vector only if absent, never clobbering. When `checkDuplicates` is set
   * (a fresh capture, not a quiet backfill of legacy rows), near-duplicate active items
   * are resurfaced — their `resurface_count` bumps so re-parking an idea brightens the
   * one you already had. Returns the ids that were bumped.
   */
  backfillEmbedding: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        embedding: z.array(z.number()).min(1).max(4096),
        checkDuplicates: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [updated] = await db
        .update(abyssItems)
        .set({ embedding: input.embedding, updatedAt: now })
        .where(
          and(
            eq(abyssItems.id, input.id),
            eq(abyssItems.userId, ctx.userId),
            isNull(abyssItems.embedding)
          )
        )
        .returning();

      // No row → the item already had an embedding (or isn't ours): nothing to do.
      if (!updated) return { id: input.id, duplicatesBumped: [] as string[] };
      await syncAbyssItemRow(updated.id, "update", updated);

      if (!input.checkDuplicates) return { id: input.id, duplicatesBumped: [] as string[] };

      const others = await db
        .select({ id: abyssItems.id, embedding: abyssItems.embedding })
        .from(abyssItems)
        .where(
          and(
            eq(abyssItems.userId, ctx.userId),
            eq(abyssItems.status, "active"),
            ne(abyssItems.id, input.id)
          )
        );

      const duplicatesBumped = selectNearDuplicates(input.embedding, others);
      for (const dupId of duplicatesBumped) {
        const [bumped] = await db
          .update(abyssItems)
          .set({
            resurfaceCount: sql`${abyssItems.resurfaceCount} + 1`,
            lastResurfacedAt: now,
            lastTouchedAt: now,
            updatedAt: now,
          })
          .where(and(eq(abyssItems.id, dupId), eq(abyssItems.userId, ctx.userId)))
          .returning();
        if (bumped) await syncAbyssItemRow(bumped.id, "update", bumped);
      }
      return { id: input.id, duplicatesBumped };
    }),

  /**
   * Promote an active item into a real target (§8B). Spawns a Today/Week task, a new
   * project, or an annual goal, links it, and sets `status = promoted` — the item stays
   * in the deep. Project/goal targets need a category (the item's, or one passed in).
   */
  promote: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        target: targetSchema,
        // Required for project/goal when the item itself has no category yet.
        category: categorySchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await db
        .select()
        .from(abyssItems)
        .where(and(eq(abyssItems.id, input.id), eq(abyssItems.userId, ctx.userId)))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });
      }
      if (item.status !== "active") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only items still in the deep can be promoted.",
        });
      }

      const now = new Date();
      let promotedTaskId: string | null = null;
      let promotedTarget: string;

      if (input.target === "today" || input.target === "week") {
        const resolved = await resolveTaskCategoryForUser({
          userId: ctx.userId,
          title: item.title,
          explicit: item.category ?? null,
          projectId: null,
        });
        const [task] = await db
          .insert(tasks)
          .values({
            userId: ctx.userId,
            title: item.title,
            scheduledDate: scheduledDateForLane(input.target, now),
            category: resolved.category,
            categoryUnresolved: resolved.unresolved,
          })
          .returning();
        if (!task) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to spawn task." });
        }
        if (!resolved.unresolved) await setLastUsedCategory(ctx.userId, resolved.category);
        await syncTaskRow(task.id, "insert", task);
        promotedTaskId = task.id;
        promotedTarget = encodePromotedTarget(input.target);
      } else if (input.target === "project") {
        const category = input.category ?? item.category;
        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pick a category to spin this into a project.",
          });
        }
        const [project] = await db
          .insert(projects)
          .values({
            userId: ctx.userId,
            name: item.title,
            slug: await uniqueProjectSlug(ctx.userId, item.title),
            category,
          })
          .returning();
        if (!project) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to spawn project.",
          });
        }
        await syncProjectRow(project.id, "insert", project);
        promotedTarget = encodePromotedTarget("project", project.id);
      } else {
        const category = input.category ?? item.category;
        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pick a category to set this as an annual goal.",
          });
        }
        const [goal] = await db
          .insert(goals)
          .values({
            userId: ctx.userId,
            title: item.title,
            category,
            targetHorizon: "year",
            targetYear: now.getFullYear(),
          })
          .returning();
        if (!goal) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to spawn goal." });
        }
        await syncPlanningRow("goals", goal.id, "insert", goal);
        promotedTarget = encodePromotedTarget("goal", goal.id);
      }

      const [updated] = await db
        .update(abyssItems)
        .set({
          status: "promoted",
          promotedTaskId,
          promotedTarget,
          lastTouchedAt: now,
          updatedAt: now,
        })
        .where(and(eq(abyssItems.id, item.id), eq(abyssItems.userId, ctx.userId)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark the item promoted.",
        });
      }

      await syncAbyssItemRow(updated.id, "update", updated);
      return updated;
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
