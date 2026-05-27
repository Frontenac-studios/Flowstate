import "server-only";

import { and, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { projects } from "@/db/schema/projects";
import { tasks } from "@/db/schema/tasks";
import { datesInIsoWeek, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { lastWeekDateRange } from "@/lib/week/template-week-draft";

export type WeekDraftContextTask = {
  id: string;
  title: string;
  priority: number;
  scheduledDate: string | null;
  projectSlug: string | null;
};

export type WeekDraftContext = {
  weekStartIso: string;
  weekEndIso: string;
  inbox: WeekDraftContextTask[];
  scheduledInWeek: WeekDraftContextTask[];
  lastWeekCompletions: { title: string }[];
  top3Incomplete: { slot: number; title: string }[];
  triageCount: number;
};

export async function fetchWeekDraftContext(
  userId: string,
  weekStartIso?: string
): Promise<WeekDraftContext> {
  const now = new Date();
  const weekDates = datesInIsoWeek(now).map(toISODateString);
  const weekStart = weekStartIso ?? weekDates[0]!;
  const weekEnd = weekDates[6]!;
  const todayIso = toISODateString(startOfLocalDay(now));
  const lastWeek = lastWeekDateRange(now);

  const [incompleteRows, completedLastWeek, top3Rows, triageRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        scheduledDate: tasks.scheduledDate,
        bucketOverride: tasks.bucketOverride,
        projectSlug: projects.slug,
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
  ]);

  const weekSet = new Set(weekDates);
  const inbox: WeekDraftContextTask[] = [];
  const scheduledInWeek: WeekDraftContextTask[] = [];

  for (const row of incompleteRows) {
    const task: WeekDraftContextTask = {
      id: row.id,
      title: row.title,
      priority: row.priority,
      scheduledDate: row.scheduledDate,
      projectSlug: row.projectSlug,
    };

    if (row.scheduledDate === null) {
      inbox.push(task);
    } else if (weekSet.has(row.scheduledDate)) {
      scheduledInWeek.push(task);
    }
  }

  const top3Incomplete = top3Rows
    .filter((t) => t.completedAt === null && t.top3Order != null)
    .map((t) => ({ slot: t.top3Order!, title: t.title }));

  return {
    weekStartIso: weekStart,
    weekEndIso: weekEnd,
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
  };
}
