import { and, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  phases,
  projects,
  taskTimeEntries,
  tasks,
  weekDayPriorities,
  weekReviews,
} from "@/db/tables";
import { aggregateProjectPhaseProgress } from "@/lib/projects/aggregate-project-phase-progress";
import { aggregateWeek } from "@/lib/time/aggregate-week";
import { buildBalanceDigestRows, templateBalanceDigest } from "@/lib/eow/balance-digest";
import { categorySeedLabel } from "@/lib/projects/category-tokens";
import { evaluateOverCommitDrift } from "@/lib/week/over-commit-drift";
import { localIsoDateFromUtcInstant, localWeekUtcBounds } from "@/lib/time/local-week-bounds";
import { fetchWeeklyCategoryAttention } from "@/server/nudges/fetch-balance-nudge-context";
import { evaluateCategoryBaseline } from "@/lib/tasks/category-baseline";
import { fetchAbyssBalanceCandidates } from "@/server/planning/fetch-abyss-balance-candidates";
import { fetchOverCommitThreshold } from "@/server/week/fetch-over-commit-threshold";
import { generateEowReview } from "@/server/claude/generate-eow-review";

import { createTRPCRouter, protectedProcedure } from "../init";

async function fetchEowPayload(userId: string, tzOffsetMinutes: number) {
  const now = new Date();
  const { start, end } = localWeekUtcBounds(now, tzOffsetMinutes);
  const weekStartIso = localIsoDateFromUtcInstant(start, tzOffsetMinutes);

  const [timeRows, completedRows, projectTasks, phaseRows, projectRows, priorityRows] =
    await Promise.all([
      db
        .select({
          startedAt: taskTimeEntries.startedAt,
          endedAt: taskTimeEntries.endedAt,
          category: tasks.category,
          projectId: tasks.projectId,
          projectName: projects.name,
        })
        .from(taskTimeEntries)
        .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(
          and(
            eq(taskTimeEntries.userId, userId),
            gte(taskTimeEntries.startedAt, start),
            lt(taskTimeEntries.startedAt, end)
          )
        ),
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
          id: tasks.id,
          projectId: tasks.projectId,
          phaseId: tasks.phaseId,
          completedAt: tasks.completedAt,
          isTop3: tasks.isTop3,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNotNull(tasks.projectId))),
      db
        .select({
          id: phases.id,
          projectId: phases.projectId,
          name: phases.name,
        })
        .from(phases)
        .where(eq(phases.userId, userId)),
      db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.userId, userId)),
      db
        .select({ taskId: weekDayPriorities.taskId })
        .from(weekDayPriorities)
        .where(eq(weekDayPriorities.userId, userId)),
    ]);

  const rollup = aggregateWeek({ entries: timeRows });
  const priorityTaskIds = new Set(priorityRows.map((row) => row.taskId));
  const projectNames = new Map(projectRows.map((row) => [row.id, row.name]));

  const progressTasks = projectTasks
    .filter((task): task is typeof task & { projectId: string } => task.projectId != null)
    .map((task) => ({
      projectId: task.projectId,
      phaseId: task.phaseId,
      completed: task.completedAt != null,
      isHeavy: task.isTop3 || priorityTaskIds.has(task.id),
    }));

  const projectProgress = aggregateProjectPhaseProgress(progressTasks, phaseRows, projectNames);

  const weeklyAttention = await fetchWeeklyCategoryAttention(userId, 8);
  const historicalWeeks = weeklyAttention.slice(0, -1);
  const currentWeek = weeklyAttention[weeklyAttention.length - 1] ?? null;
  const baseline =
    currentWeek != null
      ? evaluateCategoryBaseline({ historicalWeeks, currentWeek })
      : { starvedCategories: [], dominant: null, lopsided: false, ready: false, mostStarved: null };
  const digestCandidates =
    baseline.starvedCategories.length > 0
      ? await fetchAbyssBalanceCandidates(userId, baseline.starvedCategories)
      : [];
  const balanceDigestRows = buildBalanceDigestRows(baseline.starvedCategories, digestCandidates);
  const balanceDigest =
    baseline.ready && baseline.lopsided ? templateBalanceDigest(balanceDigestRows) : "";
  const weeklyTiltCaption =
    baseline.dominant != null
      ? `tilted toward ${categorySeedLabel(baseline.dominant).toLowerCase()} this week`
      : null;

  const overCommitSnapshot = await fetchOverCommitThreshold(userId);
  const overCommitDriftNote = evaluateOverCommitDrift({
    threshold: overCommitSnapshot.threshold,
    mode: overCommitSnapshot.mode,
    weeksWithPlanningHistory: overCommitSnapshot.weeksWithPlanningHistory,
  });

  return {
    weekStart: start,
    weekEnd: end,
    weekStartIso,
    completionsThisWeek: completedRows.length,
    projectProgress,
    balanceDigest,
    balanceDigestRows,
    weeklyTiltCaption,
    overCommitDriftNote,
    ...rollup,
  };
}

type EowPayload = Awaited<ReturnType<typeof fetchEowPayload>>;

/** JSON-safe snapshot of the EOW payload for jsonb storage (Date fields → ISO strings). */
function serializeEowPayload(payload: EowPayload) {
  return {
    ...payload,
    weekStart: payload.weekStart.toISOString(),
    weekEnd: payload.weekEnd.toISOString(),
  };
}

/**
 * Upsert the current week's review row keyed on (userId, weekStart). Always refreshes
 * the payload snapshot + updatedAt; only overwrites summary / reflectionText when provided.
 */
async function writeWeekReview(
  userId: string,
  payload: EowPayload,
  fields: { summary?: string; reflectionText?: string }
) {
  const now = new Date();
  const storedPayload = serializeEowPayload(payload);
  const normalizedSummary =
    fields.summary === undefined ? undefined : fields.summary.trim() || null;
  const normalizedReflection =
    fields.reflectionText === undefined ? undefined : fields.reflectionText.trim() || null;

  const [row] = await db
    .insert(weekReviews)
    .values({
      userId,
      weekStart: payload.weekStartIso,
      summary: normalizedSummary ?? null,
      reflectionText: normalizedReflection ?? null,
      payload: storedPayload,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [weekReviews.userId, weekReviews.weekStart],
      set: {
        payload: storedPayload,
        updatedAt: now,
        ...(normalizedSummary !== undefined ? { summary: normalizedSummary } : {}),
        ...(normalizedReflection !== undefined ? { reflectionText: normalizedReflection } : {}),
      },
    })
    .returning();

  return row!;
}

/** Safely read the lightweight stats the list view surfaces from a nullable jsonb payload. */
function readPayloadStats(payload: unknown): {
  totalSeconds: number | null;
  completionsThisWeek: number | null;
} {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    return {
      totalSeconds: typeof record.totalSeconds === "number" ? record.totalSeconds : null,
      completionsThisWeek:
        typeof record.completionsThisWeek === "number" ? record.completionsThisWeek : null,
    };
  }
  return { totalSeconds: null, completionsThisWeek: null };
}

export const weekReviewsRouter = createTRPCRouter({
  getPayload: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-840).max(840) }))
    .query(async ({ ctx, input }) => {
      return fetchEowPayload(ctx.userId, input.tzOffsetMinutes);
    }),

  getForWeek: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-840).max(840) }))
    .query(async ({ ctx, input }) => {
      const { start } = localWeekUtcBounds(new Date(), input.tzOffsetMinutes);
      const weekStartIso = localIsoDateFromUtcInstant(start, input.tzOffsetMinutes);

      const [row] = await db
        .select()
        .from(weekReviews)
        .where(and(eq(weekReviews.userId, ctx.userId), eq(weekReviews.weekStart, weekStartIso)))
        .limit(1);

      return row ?? null;
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(52).default(12) }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(weekReviews)
        .where(eq(weekReviews.userId, ctx.userId))
        .orderBy(desc(weekReviews.weekStart))
        .limit(input.limit);

      return rows.map((row) => {
        const stats = readPayloadStats(row.payload);
        return {
          weekStart: row.weekStart,
          summary: row.summary,
          reflectionText: row.reflectionText,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          totalSeconds: stats.totalSeconds,
          completionsThisWeek: stats.completionsThisWeek,
        };
      });
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        tzOffsetMinutes: z.number().int().min(-840).max(840),
        summary: z.string().optional(),
        reflectionText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payload = await fetchEowPayload(ctx.userId, input.tzOffsetMinutes);

      return writeWeekReview(ctx.userId, payload, {
        summary: input.summary,
        reflectionText: input.reflectionText,
      });
    }),

  generateSummary: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-840).max(840) }))
    .mutation(async ({ ctx, input }) => {
      const payload = await fetchEowPayload(ctx.userId, input.tzOffsetMinutes);

      const review = await generateEowReview({
        totalSeconds: payload.totalSeconds,
        completionsThisWeek: payload.completionsThisWeek,
        byCategory: payload.byCategory,
        byProject: payload.byProject,
        projectProgress: payload.projectProgress,
        overCommitDriftNote: payload.overCommitDriftNote?.message ?? null,
      });

      await writeWeekReview(ctx.userId, payload, { summary: review.summary });

      return review;
    }),
});
