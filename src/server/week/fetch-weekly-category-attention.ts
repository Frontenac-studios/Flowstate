import "server-only";

import { and, eq, gte, isNotNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { taskTimeEntries, tasks } from "@/db/tables";
import {
  addDays,
  parseISODateString,
  startOfIsoWeekMonday,
  toISODateString,
} from "@/lib/dates/local-day";
import type { ProjectCategory } from "@/lib/projects/categories";
import { emptyCategoryAttention, type CategoryAttention } from "@/lib/tasks/category-baseline";
import { taskLoadWeight } from "@/lib/week/task-load-weight";

const SECONDS_PER_WEIGHT_UNIT = 600;

function weekStartIso(isoDate: string): string {
  return toISODateString(startOfIsoWeekMonday(parseISODateString(isoDate)));
}

function addTaskWeight(
  attention: CategoryAttention,
  category: ProjectCategory,
  weight: number
): void {
  attention[category] += weight;
}

function addTimeWeight(
  attention: CategoryAttention,
  category: ProjectCategory,
  seconds: number
): void {
  attention[category] += seconds / SECONDS_PER_WEIGHT_UNIT;
}

/**
 * Per-ISO-week category attention (scheduled task load + tracked time), oldest week first.
 * Feeds the end-of-week balance digest.
 */
export async function fetchWeeklyCategoryAttention(
  userId: string,
  weekCount: number
): Promise<CategoryAttention[]> {
  const todayIso = toISODateString(new Date());
  const currentWeekStart = weekStartIso(todayIso);
  const earliest = toISODateString(addDays(parseISODateString(currentWeekStart), -(weekCount * 7)));
  const rangeEnd = addDays(parseISODateString(currentWeekStart), 7);

  const [taskRows, timeRows] = await Promise.all([
    db
      .select({
        category: tasks.category,
        scheduledDate: tasks.scheduledDate,
        isTop3: tasks.isTop3,
        top3Order: tasks.top3Order,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNotNull(tasks.scheduledDate),
          gte(tasks.scheduledDate, earliest),
          lt(tasks.scheduledDate, toISODateString(rangeEnd))
        )
      ),
    db
      .select({
        startedAt: taskTimeEntries.startedAt,
        endedAt: taskTimeEntries.endedAt,
        category: tasks.category,
      })
      .from(taskTimeEntries)
      .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
      .where(
        and(
          eq(taskTimeEntries.userId, userId),
          gte(taskTimeEntries.startedAt, parseISODateString(earliest)),
          lt(taskTimeEntries.startedAt, rangeEnd)
        )
      ),
  ]);

  const weeks = new Map<string, CategoryAttention>();
  const ensureWeek = (key: string): CategoryAttention => {
    const existing = weeks.get(key);
    if (existing) return existing;
    const fresh = emptyCategoryAttention();
    weeks.set(key, fresh);
    return fresh;
  };

  for (const row of taskRows) {
    if (!row.scheduledDate) continue;
    const key = weekStartIso(row.scheduledDate);
    addTaskWeight(ensureWeek(key), row.category, taskLoadWeight(row));
  }

  const now = new Date();
  for (const row of timeRows) {
    const key = weekStartIso(toISODateString(row.startedAt));
    const end = row.endedAt ?? now;
    const seconds = Math.max(0, Math.floor((end.getTime() - row.startedAt.getTime()) / 1000));
    addTimeWeight(ensureWeek(key), row.category, seconds);
  }

  return Array.from(weeks.keys())
    .sort()
    .map((key) => weeks.get(key)!);
}
