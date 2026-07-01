import "server-only";

import { and, desc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import {
  monthIntentions,
  projects,
  protectedBlocks,
  quarterThemes,
  tasks,
  userConstraints,
  weekDayPriorities,
} from "@/db/tables";
import {
  datesInIsoWeek,
  parseISODateString,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";
import { computeBalanceFlags } from "@/lib/planning/balance-pass";
import { toEvaluableConstraint, type EvaluableConstraint } from "@/lib/about-me/constraint-eval";
import { PROJECT_CATEGORIES, categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { lastWeekDateRange } from "@/lib/week/template-week-draft";
import { DEFAULT_OVER_COMMIT_THRESHOLD } from "@/lib/week/over-commit-threshold";
import { taskLoadWeight } from "@/lib/week/task-load-weight";
import { computeWeekCategoryLoad } from "@/lib/week/week-category-load";

export type WeekDraftContextTask = {
  id: string;
  title: string;
  priority: number;
  scheduledDate: string | null;
  projectSlug: string | null;
  category: ProjectCategory;
  categoryUnresolved: boolean;
  loadWeight: number;
};

export type WeekDraftProtectedBlock = {
  scheduledDate: string;
  category: ProjectCategory;
  label: string | null;
  startMin: number | null;
  endMin: number | null;
  status: "proposed" | "confirmed";
};

export type WeekDraftBalanceGap = {
  category: ProjectCategory;
  label: string;
  tier: "floor" | "target_gap";
};

export type WeekDraftContext = {
  weekStartIso: string;
  weekEndIso: string;
  weekDates: string[];
  inbox: WeekDraftContextTask[];
  scheduledInWeek: WeekDraftContextTask[];
  lastWeekCompletions: { title: string }[];
  top3Incomplete: { slot: number; title: string }[];
  triageCount: number;
  protectedBlocks: WeekDraftProtectedBlock[];
  categoryLoad: ReturnType<typeof computeWeekCategoryLoad>;
  balanceGaps: WeekDraftBalanceGap[];
  protectedCountByDate: Record<string, number>;
  priorityTaskIdsByDate: Record<string, Set<string>>;
  overCommitThreshold: number;
  userConstraints: EvaluableConstraint[];
};

async function statedCategoriesForWeek(
  userId: string,
  weekStartIso: string
): Promise<Set<ProjectCategory>> {
  const ref = parseISODateString(weekStartIso);
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1;
  const quarter = Math.floor((month - 1) / 3) + 1;
  const stated = new Set<ProjectCategory>();

  const [intentions, theme] = await Promise.all([
    db
      .select({ category: monthIntentions.category, text: monthIntentions.text })
      .from(monthIntentions)
      .where(
        and(
          eq(monthIntentions.userId, userId),
          eq(monthIntentions.year, year),
          eq(monthIntentions.month, month)
        )
      ),
    db
      .select({ focusCategories: quarterThemes.focusCategories })
      .from(quarterThemes)
      .where(
        and(
          eq(quarterThemes.userId, userId),
          eq(quarterThemes.year, year),
          eq(quarterThemes.quarter, quarter)
        )
      )
      .limit(1),
  ]);

  for (const row of intentions) {
    if (row.text.trim()) stated.add(row.category);
  }

  const focus = theme[0]?.focusCategories;
  if (Array.isArray(focus)) {
    for (const category of focus) {
      if (PROJECT_CATEGORIES.includes(category as ProjectCategory)) {
        stated.add(category as ProjectCategory);
      }
    }
  }

  return stated;
}

export async function fetchWeekDraftContext(
  userId: string,
  weekStartIso?: string
): Promise<WeekDraftContext> {
  const now = new Date();
  const weekRef = weekStartIso ? parseISODateString(weekStartIso) : now;
  const weekDates = datesInIsoWeek(weekRef).map(toISODateString);
  const weekStart = weekDates[0]!;
  const weekEnd = weekDates[6]!;
  const todayIso = toISODateString(startOfLocalDay(now));
  const lastWeek = lastWeekDateRange(weekRef);

  const [
    incompleteRows,
    completedLastWeek,
    top3Rows,
    triageRows,
    protectedRows,
    priorityRows,
    constraintRows,
  ] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        scheduledDate: tasks.scheduledDate,
        bucketOverride: tasks.bucketOverride,
        projectSlug: projects.slug,
        category: tasks.category,
        categoryUnresolved: tasks.categoryUnresolved,
        isTop3: tasks.isTop3,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.completedAt)))
      .orderBy(desc(tasks.priority)),
    db
      .select({ title: tasks.title, completedAt: tasks.completedAt })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNotNull(tasks.completedAt)))
      .orderBy(desc(tasks.completedAt))
      .limit(30),
    db
      .select({
        title: tasks.title,
        top3Order: tasks.top3Order,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order)))
      .orderBy(tasks.top3Order),
    db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          isNotNull(tasks.scheduledDate),
          lte(tasks.scheduledDate, todayIso)
        )
      ),
    db
      .select({
        scheduledDate: protectedBlocks.scheduledDate,
        category: protectedBlocks.category,
        label: protectedBlocks.label,
        startMin: protectedBlocks.startMin,
        endMin: protectedBlocks.endMin,
        status: protectedBlocks.status,
      })
      .from(protectedBlocks)
      .where(
        and(
          eq(protectedBlocks.userId, userId),
          gte(protectedBlocks.scheduledDate, weekStart),
          lte(protectedBlocks.scheduledDate, weekEnd),
          inArray(protectedBlocks.status, ["confirmed", "proposed"])
        )
      ),
    db
      .select({
        taskId: weekDayPriorities.taskId,
        scheduledDate: weekDayPriorities.scheduledDate,
      })
      .from(weekDayPriorities)
      .where(
        and(
          eq(weekDayPriorities.userId, userId),
          gte(weekDayPriorities.scheduledDate, weekStart),
          lte(weekDayPriorities.scheduledDate, weekEnd)
        )
      ),
    db
      .select({
        id: userConstraints.id,
        type: userConstraints.type,
        label: userConstraints.label,
        schedule: userConstraints.schedule,
        severity: userConstraints.severity,
      })
      .from(userConstraints)
      .where(eq(userConstraints.userId, userId))
      .orderBy(userConstraints.sortOrder),
  ]);

  const weekSet = new Set(weekDates);
  const inbox: WeekDraftContextTask[] = [];
  const scheduledInWeek: WeekDraftContextTask[] = [];
  const scheduledForLoad: Array<{
    category: ProjectCategory;
    categoryUnresolved: boolean;
    isTop3: boolean;
    dayPriorityOrder: number | null;
  }> = [];

  const priorityTaskIdsByDate: Record<string, Set<string>> = Object.fromEntries(
    weekDates.map((iso) => [iso, new Set<string>()])
  );
  for (const row of priorityRows) {
    priorityTaskIdsByDate[row.scheduledDate]?.add(row.taskId);
  }

  for (const row of incompleteRows) {
    const isWeekPriority =
      row.scheduledDate != null && priorityTaskIdsByDate[row.scheduledDate]?.has(row.id);
    const task: WeekDraftContextTask = {
      id: row.id,
      title: row.title,
      priority: row.priority,
      scheduledDate: row.scheduledDate,
      projectSlug: row.projectSlug,
      category: row.category,
      categoryUnresolved: row.categoryUnresolved,
      loadWeight: taskLoadWeight({
        isTop3: row.isTop3,
        dayPriorityOrder: isWeekPriority ? 1 : null,
      }),
    };

    if (row.scheduledDate === null) {
      inbox.push(task);
    } else if (weekSet.has(row.scheduledDate)) {
      scheduledInWeek.push(task);
      scheduledForLoad.push({
        category: row.category,
        categoryUnresolved: row.categoryUnresolved,
        isTop3: row.isTop3,
        dayPriorityOrder: isWeekPriority ? 1 : null,
      });
    }
  }

  const protectedBlocksForContext: WeekDraftProtectedBlock[] = protectedRows.map((row) => ({
    scheduledDate: row.scheduledDate,
    category: row.category,
    label: row.label,
    startMin: row.startMin,
    endMin: row.endMin,
    status: row.status,
  }));

  const protectedCountByDate: Record<string, number> = Object.fromEntries(
    weekDates.map((iso) => [iso, 0])
  );
  for (const block of protectedBlocksForContext) {
    protectedCountByDate[block.scheduledDate] =
      (protectedCountByDate[block.scheduledDate] ?? 0) + 1;
  }

  const categoryLoad = computeWeekCategoryLoad({
    tasks: scheduledForLoad,
    protectedBlocks: protectedBlocksForContext,
  });

  const stated = await statedCategoriesForWeek(userId, weekStart);
  const categoryWeights = Object.fromEntries(
    PROJECT_CATEGORIES.map((category) => [category, categoryLoad.byCategory[category].weight])
  ) as Record<ProjectCategory, number>;

  const balanceGaps: WeekDraftBalanceGap[] = computeBalanceFlags(categoryWeights, stated).map(
    (flag) => ({
      category: flag.category,
      tier: flag.tier,
      label:
        flag.tier === "floor"
          ? `${categoryLabel(flag.category)} has had almost no attention this week`
          : `${categoryLabel(flag.category)} is below your stated intention`,
    })
  );

  const top3Incomplete = top3Rows
    .filter((t) => t.completedAt === null && t.top3Order != null)
    .map((t) => ({ slot: t.top3Order!, title: t.title }));

  return {
    weekStartIso: weekStart,
    weekEndIso: weekEnd,
    weekDates,
    inbox,
    scheduledInWeek,
    lastWeekCompletions: completedLastWeek
      .filter((row) => {
        if (!row.completedAt) return false;
        const iso = toISODateString(startOfLocalDay(row.completedAt));
        return iso >= lastWeek.start && iso <= lastWeek.end;
      })
      .slice(0, 15)
      .map((row) => ({ title: row.title })),
    top3Incomplete,
    triageCount: triageRows.length,
    protectedBlocks: protectedBlocksForContext,
    categoryLoad,
    balanceGaps,
    protectedCountByDate,
    priorityTaskIdsByDate,
    overCommitThreshold: DEFAULT_OVER_COMMIT_THRESHOLD,
    userConstraints: constraintRows.map(toEvaluableConstraint),
  };
}
