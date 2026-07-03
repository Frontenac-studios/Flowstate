import { and, eq, gte, isNotNull, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { phases, projects, taskTimeEntries, tasks, weekDayPriorities } from "@/db/tables";
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

export const weekReviewsRouter = createTRPCRouter({
  getPayload: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-840).max(840) }))
    .query(async ({ ctx, input }) => {
      return fetchEowPayload(ctx.userId, input.tzOffsetMinutes);
    }),

  generateSummary: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-840).max(840) }))
    .mutation(async ({ ctx, input }) => {
      const payload = await fetchEowPayload(ctx.userId, input.tzOffsetMinutes);

      return generateEowReview({
        totalSeconds: payload.totalSeconds,
        completionsThisWeek: payload.completionsThisWeek,
        byCategory: payload.byCategory,
        byProject: payload.byProject,
        projectProgress: payload.projectProgress,
        overCommitDriftNote: payload.overCommitDriftNote?.message ?? null,
      });
    }),
});
