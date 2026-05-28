import { and, asc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { dayReviews, taskTimeEntries, tasks } from "@/db/tables";
import { aggregateFocusToday } from "@/lib/eod/aggregate-focus-today";
import { buildTop3Status } from "@/lib/eod/build-top3-status";
import { countCompletionsToday } from "@/lib/eod/count-completions-today";
import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";
import { top3StatusSchema } from "@/lib/eod/types";
import { generateEodReview } from "@/server/claude/generate-eod-review";

import { createTRPCRouter, protectedProcedure } from "../init";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function fetchEodPayload(userId: string, localDate: string, tzOffsetMinutes: number) {
  const { start, end } = localDayUtcBounds(localDate, tzOffsetMinutes);

  const [top3Rows, completedRows, timeEntryRows, savedReview] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        top3Order: tasks.top3Order,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order)))
      .orderBy(asc(tasks.top3Order)),
    db
      .select({ completedAt: tasks.completedAt })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNotNull(tasks.completedAt),
          gte(tasks.completedAt, start),
          lt(tasks.completedAt, end)
        )
      ),
    db
      .select({
        taskId: taskTimeEntries.taskId,
        startedAt: taskTimeEntries.startedAt,
        endedAt: taskTimeEntries.endedAt,
      })
      .from(taskTimeEntries)
      .where(
        and(
          eq(taskTimeEntries.userId, userId),
          gte(taskTimeEntries.startedAt, start),
          lt(taskTimeEntries.startedAt, end)
        )
      ),
    db
      .select({
        summary: dayReviews.summary,
        reflectionText: dayReviews.reflectionText,
        reflectiveQuestion: dayReviews.reflectiveQuestion,
        top3Status: dayReviews.top3Status,
      })
      .from(dayReviews)
      .where(and(eq(dayReviews.userId, userId), eq(dayReviews.reviewDate, localDate)))
      .limit(1),
  ]);

  const top3Status = buildTop3Status(top3Rows);
  const completionsToday = countCompletionsToday(completedRows, localDate, tzOffsetMinutes);

  const taskIds = Array.from(new Set(timeEntryRows.map((e) => e.taskId)));
  const titleRows =
    taskIds.length > 0
      ? await db
          .select({ id: tasks.id, title: tasks.title })
          .from(tasks)
          .where(eq(tasks.userId, userId))
      : [];

  const taskTitles = new Map(titleRows.map((t) => [t.id, t.title]));
  const { bars, totalCount } = aggregateFocusToday({
    entries: timeEntryRows,
    taskTitles,
    localDate,
    tzOffsetMinutes,
  });

  const saved = savedReview[0];
  const parsedTop3 = saved?.top3Status ? top3StatusSchema.safeParse(saved.top3Status) : null;

  return {
    localDate,
    top3Status,
    completionsToday,
    focusBars: bars,
    focusOverflowCount: Math.max(0, totalCount - bars.length),
    savedReview: saved
      ? {
          summary: saved.summary ?? "",
          reflectionText: saved.reflectionText ?? null,
          reflectiveQuestion: saved.reflectiveQuestion ?? null,
          top3Status: parsedTop3?.success ? parsedTop3.data : top3Status,
        }
      : null,
  };
}

export const dayReviewsRouter = createTRPCRouter({
  getForDate: protectedProcedure
    .input(z.object({ localDate: localDateSchema }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(dayReviews)
        .where(and(eq(dayReviews.userId, ctx.userId), eq(dayReviews.reviewDate, input.localDate)))
        .limit(1);

      return row ?? null;
    }),

  getPayload: protectedProcedure
    .input(
      z.object({
        localDate: localDateSchema,
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      return fetchEodPayload(ctx.userId, input.localDate, input.tzOffsetMinutes);
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        localDate: localDateSchema,
        summary: z.string().min(1).max(8000),
        top3Status: top3StatusSchema,
        reflectiveQuestion: z.string().min(1).max(2000).nullable().optional(),
        reflectionText: z.string().max(8000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const reflectionText =
        input.reflectionText === undefined || input.reflectionText === null
          ? null
          : input.reflectionText.trim() || null;
      const reflectiveQuestion =
        input.reflectiveQuestion === undefined || input.reflectiveQuestion === null
          ? null
          : input.reflectiveQuestion.trim() || null;

      const [row] = await db
        .insert(dayReviews)
        .values({
          userId: ctx.userId,
          reviewDate: input.localDate,
          summary: input.summary.trim(),
          top3Status: input.top3Status,
          reflectionText,
          reflectiveQuestion,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [dayReviews.userId, dayReviews.reviewDate],
          set: {
            summary: input.summary.trim(),
            top3Status: input.top3Status,
            reflectionText,
            reflectiveQuestion,
            updatedAt: now,
          },
        })
        .returning();

      return row!;
    }),

  generateSummary: protectedProcedure
    .input(
      z.object({
        localDate: localDateSchema,
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payload = await fetchEodPayload(ctx.userId, input.localDate, input.tzOffsetMinutes);

      return generateEodReview({
        completionsToday: payload.completionsToday,
        top3Status: payload.top3Status,
        focusBars: payload.focusBars,
        focusOverflowCount: payload.focusOverflowCount,
      });
    }),
});
