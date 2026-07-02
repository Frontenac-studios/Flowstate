import { and, asc, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import {
  syncCareActivityRow,
  syncCareEventRow,
  syncCareReflectionRow,
  syncRecurrenceRow,
  syncTaskRow,
} from "@/db/record-sync-mutation";
import { careActivities, careEvents, careReflections, taskRecurrence, tasks } from "@/db/tables";
import { CARE_CADENCES, CARE_KINDS, CARE_THEMES, REFLECTION_SCOPES } from "@/db/schema/care-enums";
import { availableCatalog, isCatalogKey } from "@/lib/care/catalog";
import { cadenceToRRule } from "@/lib/care/cadence";
import { buildCareStatsSummary } from "@/lib/care/care-stats";
import { deriveLiftsMe } from "@/lib/care/lifts-me";
import { extraPlantCount, gardenGrowthTier } from "@/lib/care/garden-growth";
import { gardenLifeState } from "@/lib/care/garden-dormancy";
import { formatReflectionPrompt, templateReflectionPrompt } from "@/lib/care/reflection-prompt";
import { SEED_CATALOG } from "@/lib/care/seed-catalog";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import type { CareEventDailyWinMeta } from "@/db/schema/care-events";

import { createTRPCRouter, protectedProcedure } from "../init";

const themeSchema = z.enum(CARE_THEMES);
const kindSchema = z.enum(CARE_KINDS);
const cadenceSchema = z.enum(CARE_CADENCES);
const reflectionScopeSchema = z.enum(REFLECTION_SCOPES);
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const moodSchema = z.number().int().min(1).max(5);

/** Seed lookup for Adopt — copy a catalog entry's frozen fields onto the new row. */
const SEED_BY_KEY = new Map(SEED_CATALOG.map((practice) => [practice.key, practice]));

async function getOwnedActivity(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(careActivities)
    .where(and(eq(careActivities.id, id), eq(careActivities.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Practice not found." });
  }

  return row;
}

export const careRouter = createTRPCRouter({
  // Your practices — the library shelf, theme-grouped, archived rows hidden.
  listActivities: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(careActivities)
      .where(and(eq(careActivities.userId, ctx.userId), isNull(careActivities.archivedAt)))
      .orderBy(asc(careActivities.theme), asc(careActivities.createdAt));
  }),

  // Suggested — the seed catalog minus practices the user has already adopted.
  catalog: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({ catalogKey: careActivities.catalogKey })
      .from(careActivities)
      .where(
        and(
          eq(careActivities.userId, ctx.userId),
          isNotNull(careActivities.catalogKey),
          isNull(careActivities.archivedAt)
        )
      );

    const adoptedKeys = rows.map((r) => r.catalogKey).filter((k): k is string => k !== null);
    return availableCatalog(adoptedKeys);
  }),

  // Adopt a suggested practice. Idempotent: a second adopt of a still-held key is a
  // no-op returning the existing row (the catalog already hides adopted keys; a
  // double-adopt is a benign race).
  adopt: protectedProcedure
    .input(z.object({ key: z.string().refine(isCatalogKey, "Unknown catalog key.") }))
    .mutation(async ({ ctx, input }) => {
      const seed = SEED_BY_KEY.get(input.key);
      if (!seed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown catalog key." });
      }

      const [existing] = await db
        .select()
        .from(careActivities)
        .where(
          and(
            eq(careActivities.userId, ctx.userId),
            eq(careActivities.catalogKey, input.key),
            isNull(careActivities.archivedAt)
          )
        )
        .limit(1);

      if (existing) return existing;

      const [row] = await db
        .insert(careActivities)
        .values({
          userId: ctx.userId,
          title: seed.title,
          theme: seed.theme,
          kind: seed.kind ?? null,
          cadence: seed.cadence ?? null,
          source: "suggested",
          catalogKey: seed.key,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to adopt practice.",
        });
      }

      await syncCareActivityRow(row.id, "insert", row);
      return row;
    }),

  createCustom: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        theme: themeSchema,
        cadence: cadenceSchema.optional(),
        kind: kindSchema.optional(),
        note: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(careActivities)
        .values({
          userId: ctx.userId,
          title: input.title,
          theme: input.theme,
          cadence: input.cadence ?? null,
          kind: input.kind ?? null,
          note: input.note ?? null,
          source: "custom",
          catalogKey: null,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create practice.",
        });
      }

      await syncCareActivityRow(row.id, "insert", row);
      return row;
    }),

  // Edit user-facing fields only. source/catalogKey/archivedAt are immutable here
  // (archive has its own procedure) so the adopted-key de-dupe contract stays intact.
  updateActivity: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        theme: themeSchema.optional(),
        cadence: cadenceSchema.nullable().optional(),
        kind: kindSchema.nullable().optional(),
        note: z.string().trim().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedActivity(ctx.userId, input.id);

      const patch: Partial<typeof careActivities.$inferInsert> = { updatedAt: new Date() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.theme !== undefined) patch.theme = input.theme;
      if (input.cadence !== undefined) patch.cadence = input.cadence;
      if (input.kind !== undefined) patch.kind = input.kind;
      if (input.note !== undefined) patch.note = input.note;

      const [row] = await db
        .update(careActivities)
        .set(patch)
        .where(and(eq(careActivities.id, input.id), eq(careActivities.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update practice.",
        });
      }

      await syncCareActivityRow(row.id, "update", row);
      return row;
    }),

  // Soft-remove from the list — set archived_at, never a hard delete (events outlive it).
  archiveActivity: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedActivity(ctx.userId, input.id);
      const now = new Date();

      const [row] = await db
        .update(careActivities)
        .set({ archivedAt: now, updatedAt: now })
        .where(and(eq(careActivities.id, input.id), eq(careActivities.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive practice.",
        });
      }

      await syncCareActivityRow(row.id, "update", row);
      return row;
    }),

  // Check-off — log that the practice was done (occurred_at defaults to now).
  logEvent: protectedProcedure
    .input(z.object({ activityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedActivity(ctx.userId, input.activityId);

      const [row] = await db
        .insert(careEvents)
        .values({ userId: ctx.userId, activityId: input.activityId })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to log event." });
      }

      await syncCareEventRow(row.id, "insert", row);
      return row;
    }),

  // Undo today's check-off — remove the care_events this activity logged today
  // (the toggle-off half of the row checkbox). No-op if nothing was logged today.
  unlogEvent: protectedProcedure
    .input(z.object({ activityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedActivity(ctx.userId, input.activityId);
      const dayStart = startOfLocalDay();

      const deleted = await db
        .delete(careEvents)
        .where(
          and(
            eq(careEvents.userId, ctx.userId),
            eq(careEvents.activityId, input.activityId),
            gte(careEvents.occurredAt, dayStart)
          )
        )
        .returning({ id: careEvents.id });

      for (const row of deleted) {
        await syncCareEventRow(row.id, "delete", { id: row.id });
      }

      return { deletedCount: deleted.length };
    }),

  // Add to my day — spawn a Body & Mind task linked back via tasks.care_activity_id,
  // plus a recurrence row when the practice carries a cadence. Mirrors the task +
  // recurrence creation path in tasks.create (category forced to body_mind here).
  addToMyDay: protectedProcedure
    .input(
      z.object({
        activityId: z.string().uuid(),
        /** Pin to a calendar day (defaults to today). */
        scheduledDate: localDateSchema.optional(),
        /** Override cadence-derived repeat; null = one-off. */
        rrule: z.string().trim().min(1).max(500).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activity = await getOwnedActivity(ctx.userId, input.activityId);

      const todayIso = toISODateString(startOfLocalDay());
      const pinDate = input.scheduledDate ?? todayIso;
      const rrule = input.rrule !== undefined ? input.rrule : cadenceToRRule(activity.cadence);

      const [task] = await db
        .insert(tasks)
        .values({
          userId: ctx.userId,
          title: activity.title,
          priority: 0,
          category: "body_mind",
          categoryUnresolved: false,
          careActivityId: activity.id,
          scheduledDate: rrule ? null : pinDate,
        })
        .returning();

      if (!task) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create task." });
      }

      await syncTaskRow(task.id, "insert", task);

      let recurrence = null;
      if (rrule) {
        [recurrence] = await db
          .insert(taskRecurrence)
          .values({
            userId: ctx.userId,
            taskId: task.id,
            rrule,
            startDate: pinDate,
          })
          .returning();

        if (recurrence) {
          await syncRecurrenceRow(recurrence.id, "insert", recurrence);
        }
      }

      return { task, recurrence };
    }),

  // Today's check-offs — drives each row's "done today" state in the list.
  recentEvents: protectedProcedure.query(async ({ ctx }) => {
    const dayStart = startOfLocalDay();
    return db
      .select({ activityId: careEvents.activityId, occurredAt: careEvents.occurredAt })
      .from(careEvents)
      .where(and(eq(careEvents.userId, ctx.userId), gte(careEvents.occurredAt, dayStart)))
      .orderBy(desc(careEvents.occurredAt));
  }),

  /** Garden nourishment totals — practice check-offs, bingo lines, and daily wins. */
  getGardenState: protectedProcedure.query(async ({ ctx }) => {
    const [countRow] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(careEvents)
      .where(eq(careEvents.userId, ctx.userId));

    const [lastActiveRow] = await db
      .select({ occurredAt: careEvents.occurredAt })
      .from(careEvents)
      .where(eq(careEvents.userId, ctx.userId))
      .orderBy(desc(careEvents.occurredAt))
      .limit(1);

    const nourishCount = countRow?.count ?? 0;
    const lastActiveAt = lastActiveRow?.occurredAt ?? null;
    const lifeState = gardenLifeState({ lastActiveAt });

    return {
      nourishCount,
      growthTier: gardenGrowthTier(nourishCount),
      extraPlants: extraPlantCount(nourishCount),
      lastActiveAt,
      lifeState,
    };
  }),

  /** Self-care frequency + mood trend for the Stats tab. */
  getStatsSummary: protectedProcedure
    .input(z.object({ days: z.number().int().min(7).max(30).default(14) }))
    .query(async ({ ctx, input }) => {
      const windowStart = new Date();
      windowStart.setHours(0, 0, 0, 0);
      windowStart.setDate(windowStart.getDate() - (input.days - 1));

      const [events, reflections] = await Promise.all([
        db
          .select({
            occurredAt: careEvents.occurredAt,
            theme: careActivities.theme,
            kind: careActivities.kind,
          })
          .from(careEvents)
          .leftJoin(careActivities, eq(careEvents.activityId, careActivities.id))
          .where(and(eq(careEvents.userId, ctx.userId), gte(careEvents.occurredAt, windowStart))),
        db
          .select({
            reflectionDate: careReflections.reflectionDate,
            mood: careReflections.mood,
          })
          .from(careReflections)
          .where(
            and(
              eq(careReflections.userId, ctx.userId),
              gte(careReflections.reflectionDate, toISODateString(windowStart))
            )
          ),
      ]);

      return buildCareStatsSummary({ events, reflections, windowDays: input.days });
    }),

  /** "What lifts me" — explicit hearts + regulars from care_events frequency. */
  getLiftsMe: protectedProcedure.query(async ({ ctx }) => {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 30);

    const [activities, events] = await Promise.all([
      db
        .select({
          id: careActivities.id,
          title: careActivities.title,
          liftsMe: careActivities.liftsMe,
        })
        .from(careActivities)
        .where(and(eq(careActivities.userId, ctx.userId), isNull(careActivities.archivedAt))),
      db
        .select({ activityId: careEvents.activityId, occurredAt: careEvents.occurredAt })
        .from(careEvents)
        .where(and(eq(careEvents.userId, ctx.userId), gte(careEvents.occurredAt, windowStart))),
    ]);

    return deriveLiftsMe({ activities, events });
  }),

  toggleLiftsMe: protectedProcedure
    .input(z.object({ id: z.string().uuid(), liftsMe: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedActivity(ctx.userId, input.id);

      const [row] = await db
        .update(careActivities)
        .set({ liftsMe: input.liftsMe, updatedAt: new Date() })
        .where(and(eq(careActivities.id, input.id), eq(careActivities.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update practice.",
        });
      }

      await syncCareActivityRow(row.id, "update", row);
      return row;
    }),

  logBreathingSession: protectedProcedure
    .input(
      z.object({
        preset: z.enum(["box4", "relax4-6"]),
        cycles: z.number().int().min(1).max(20),
        durationSeconds: z.number().int().min(1).max(3600),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const durationMinutes = Math.max(1, Math.round(input.durationSeconds / 60));

      const [row] = await db
        .insert(careEvents)
        .values({
          userId: ctx.userId,
          activityId: null,
          source: "breathing",
          durationMinutes,
          meta: { preset: input.preset, cycles: input.cycles },
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to log breathing session.",
        });
      }

      await syncCareEventRow(row.id, "insert", row);
      return row;
    }),

  getReflectionPrompt: protectedProcedure
    .input(z.object({ reflectionDate: localDateSchema.optional() }))
    .query(async ({ input }) => {
      const reflectionDate = input.reflectionDate ?? toISODateString(startOfLocalDay());
      const frame = templateReflectionPrompt(reflectionDate);
      return {
        reflectionDate,
        scope: "daily" as const,
        promptText: formatReflectionPrompt(frame),
        frame,
      };
    }),

  getReflectionForDate: protectedProcedure
    .input(
      z.object({
        reflectionDate: localDateSchema,
        scope: reflectionScopeSchema.default("daily"),
      })
    )
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(careReflections)
        .where(
          and(
            eq(careReflections.userId, ctx.userId),
            eq(careReflections.reflectionDate, input.reflectionDate),
            eq(careReflections.scope, input.scope)
          )
        )
        .limit(1);

      return row ?? null;
    }),

  saveReflection: protectedProcedure
    .input(
      z.object({
        reflectionDate: localDateSchema,
        scope: reflectionScopeSchema.default("daily"),
        promptText: z.string().trim().min(1).max(4000),
        bodyText: z.string().trim().max(8000).nullable().optional(),
        mood: moodSchema.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: careReflections.id })
        .from(careReflections)
        .where(
          and(
            eq(careReflections.userId, ctx.userId),
            eq(careReflections.reflectionDate, input.reflectionDate),
            eq(careReflections.scope, input.scope)
          )
        )
        .limit(1);

      const now = new Date();
      const values = {
        userId: ctx.userId,
        reflectionDate: input.reflectionDate,
        scope: input.scope,
        promptText: input.promptText,
        bodyText: input.bodyText ?? null,
        mood: input.mood ?? null,
        updatedAt: now,
      };

      if (existing) {
        const [row] = await db
          .update(careReflections)
          .set(values)
          .where(eq(careReflections.id, existing.id))
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update reflection.",
          });
        }

        await syncCareReflectionRow(row.id, "update", row);
        return row;
      }

      const [row] = await db.insert(careReflections).values(values).returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save reflection.",
        });
      }

      await syncCareReflectionRow(row.id, "insert", row);
      return row;
    }),

  listReflectionArchive: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(30).default(14) }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          id: careReflections.id,
          reflectionDate: careReflections.reflectionDate,
          scope: careReflections.scope,
          bodyText: careReflections.bodyText,
          mood: careReflections.mood,
          updatedAt: careReflections.updatedAt,
        })
        .from(careReflections)
        .where(eq(careReflections.userId, ctx.userId))
        .orderBy(desc(careReflections.reflectionDate), desc(careReflections.updatedAt))
        .limit(input.limit);
    }),

  /** Recent daily-win nourishments for Care-only garden animation (AN-C3). */
  recentWinNourishments: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(8) }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: careEvents.id,
          meta: careEvents.meta,
          occurredAt: careEvents.occurredAt,
        })
        .from(careEvents)
        .where(and(eq(careEvents.userId, ctx.userId), eq(careEvents.source, "daily_win")))
        .orderBy(desc(careEvents.occurredAt))
        .limit(input.limit);

      return rows
        .map((row) => {
          const meta = row.meta as CareEventDailyWinMeta | null;
          if (!meta?.dailyWinId) return null;
          return {
            id: row.id,
            dailyWinId: meta.dailyWinId,
            winDate: meta.winDate,
            beat: meta.beat,
            occurredAt: row.occurredAt,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
    }),

  /** Record a planning bingo line reward as garden nourishment (RW-2). */
  recordBingoNourish: protectedProcedure
    .input(
      z.object({
        cardYear: z.number().int().min(2000).max(2100),
        lineType: z.enum(["row", "column", "diagonal"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(careEvents)
        .values({
          userId: ctx.userId,
          activityId: null,
          source: "bingo",
          meta: { cardYear: input.cardYear, lineType: input.lineType },
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record bingo nourishment.",
        });
      }

      await syncCareEventRow(row.id, "insert", row);
      return row;
    }),
});
