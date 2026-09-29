import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncTaskRow, syncTaskTagStyleRow } from "@/db/record-sync-mutation";
import { taskTagStyles, tasks } from "@/db/tables";
import { taskTagsColumn } from "@/db/task-tags-for-db";
import {
  BUILTIN_STATUS_TAGS,
  TAG_COLORS,
  TAG_KINDS,
  resolveTagStyle,
  tagKey,
  type TagStyle,
} from "@/lib/tasks/tag-styles";
import { normalizeTaskTag, normalizeTaskTags } from "@/lib/tasks/tags";

import { createTRPCRouter, protectedProcedure } from "../init";

const tagNameSchema = z.string().trim().min(1).max(64);

async function loadStyleMap(userId: string): Promise<Map<string, TagStyle>> {
  const rows = await db
    .select({
      nameKey: taskTagStyles.nameKey,
      kind: taskTagStyles.kind,
      color: taskTagStyles.color,
    })
    .from(taskTagStyles)
    .where(eq(taskTagStyles.userId, userId));
  return new Map(
    rows.map((r) => [
      r.nameKey,
      { kind: r.kind as TagStyle["kind"], color: r.color as TagStyle["color"] },
    ])
  );
}

/** Spec v3 "Ta" — tag kinds and opt-in colours, plus rename and status counts. */
export const taskTagsRouter = createTRPCRouter({
  listStyles: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        name: taskTagStyles.name,
        nameKey: taskTagStyles.nameKey,
        kind: taskTagStyles.kind,
        color: taskTagStyles.color,
      })
      .from(taskTagStyles)
      .where(eq(taskTagStyles.userId, ctx.userId));
  }),

  /** Set a tag's kind and/or colour. Omitted fields keep their current value. */
  setStyle: protectedProcedure
    .input(
      z.object({
        name: tagNameSchema,
        kind: z.enum(TAG_KINDS).nullable().optional(),
        color: z.enum(TAG_COLORS).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const name = normalizeTaskTag(input.name);
      const key = tagKey(name);
      const current = resolveTagStyle(name, await loadStyleMap(ctx.userId));
      const next = {
        kind: input.kind !== undefined ? input.kind : current.kind,
        color: input.color !== undefined ? input.color : current.color,
      };
      const [existing] = await db
        .select({ id: taskTagStyles.id })
        .from(taskTagStyles)
        .where(and(eq(taskTagStyles.userId, ctx.userId), eq(taskTagStyles.nameKey, key)))
        .limit(1);
      const [row] = existing
        ? await db
            .update(taskTagStyles)
            .set({ ...next, name, updatedAt: new Date() })
            .where(eq(taskTagStyles.id, existing.id))
            .returning()
        : await db
            .insert(taskTagStyles)
            .values({ userId: ctx.userId, name, nameKey: key, ...next })
            .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save tag." });
      }
      await syncTaskTagStyleRow(row.id, existing ? "update" : "insert", row);
      return row;
    }),

  /**
   * Rename a tag on every task that carries it (case-insensitive), carrying its
   * kind/colour over. Renaming onto an existing tag merges the two.
   */
  rename: protectedProcedure
    .input(z.object({ from: tagNameSchema, to: tagNameSchema }))
    .mutation(async ({ ctx, input }) => {
      const to = normalizeTaskTag(input.to);
      const fromKey = tagKey(input.from);
      if (!to) throw new TRPCError({ code: "BAD_REQUEST", message: "Tag name can't be empty." });

      const rows = await db
        .select({ id: tasks.id, tags: tasks.tags })
        .from(tasks)
        .where(eq(tasks.userId, ctx.userId));
      let renamed = 0;
      for (const row of rows) {
        const current = row.tags ?? [];
        if (!current.some((t) => tagKey(t) === fromKey)) continue;
        const next = normalizeTaskTags(current.map((t) => (tagKey(t) === fromKey ? to : t)));
        const [updated] = await db
          .update(tasks)
          .set({ tags: taskTagsColumn(next), updatedAt: new Date() })
          .where(and(eq(tasks.id, row.id), eq(tasks.userId, ctx.userId)))
          .returning();
        if (updated) await syncTaskRow(updated.id, "update", updated);
        renamed += 1;
      }

      // Carry the style: move it onto the new name unless the new name already has one.
      const styles = await db
        .select()
        .from(taskTagStyles)
        .where(eq(taskTagStyles.userId, ctx.userId));
      const source = styles.find((s) => s.nameKey === fromKey);
      const target = styles.find((s) => s.nameKey === tagKey(to));
      if (source && !target) {
        const [moved] = await db
          .update(taskTagStyles)
          .set({ name: to, nameKey: tagKey(to), updatedAt: new Date() })
          .where(eq(taskTagStyles.id, source.id))
          .returning();
        if (moved) await syncTaskTagStyleRow(moved.id, "update", moved);
      } else if (source && target) {
        await db.delete(taskTagStyles).where(eq(taskTagStyles.id, source.id));
        await syncTaskTagStyleRow(source.id, "delete", { id: source.id, userId: ctx.userId });
      }
      return { renamed, to };
    }),

  /** Open-task counts for each status tag (the built-ins plus any tag of kind status). */
  statusCounts: protectedProcedure.query(async ({ ctx }) => {
    const styles = await loadStyleMap(ctx.userId);
    const storedRows = await db
      .select({ name: taskTagStyles.name, nameKey: taskTagStyles.nameKey })
      .from(taskTagStyles)
      .where(eq(taskTagStyles.userId, ctx.userId));
    const names = new Map<string, string>();
    for (const t of BUILTIN_STATUS_TAGS) names.set(tagKey(t.name), t.name);
    for (const r of storedRows) names.set(r.nameKey, r.name);

    const statusKeys = Array.from(names.keys()).filter(
      (key) => resolveTagStyle(names.get(key)!, styles).kind === "status"
    );
    const counts = new Map(statusKeys.map((k) => [k, 0]));
    const open = await db
      .select({ tags: tasks.tags })
      .from(tasks)
      .where(and(eq(tasks.userId, ctx.userId), isNull(tasks.completedAt)));
    for (const row of open) {
      for (const key of Array.from(new Set((row.tags ?? []).map(tagKey)))) {
        if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
      }
    }
    return statusKeys.map((key) => {
      const name = names.get(key)!;
      return { name, color: resolveTagStyle(name, styles).color, count: counts.get(key) ?? 0 };
    });
  }),
});
