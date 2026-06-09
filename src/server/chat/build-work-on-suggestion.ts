import "server-only";

import { and, eq, isNotNull, isNull, lt, ne, or } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, taskTimeEntries, tasks } from "@/db/tables";
import { getChatSuggestionDef } from "@/lib/chat/chat-suggestion-defs";
import { formatWorkOnReply } from "@/lib/chat/format-work-on-reply";
import { getLocalHour, nudgeThresholdHour, startedOnLocalDay } from "@/lib/nudges/local-time";
import { pickWorkOnTask } from "@/lib/rdm/pick-work-on-task";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import { matchesTodayList } from "@/lib/tasks/matches-today-list";
import { isTop3ActiveForLocalDate } from "@/lib/tasks/top3-local-day";

export type SuggestWorkOnInput = {
  userId: string;
  localDate: string;
  tzOffsetMinutes: number;
  lastWasLarge?: boolean;
};

export type SuggestWorkOnResult = {
  userText: string;
  assistantText: string;
  pick: {
    id: string;
    title: string;
    isTop3: boolean;
    pickReason: string;
  } | null;
  lastWasLarge: boolean;
};

export async function buildWorkOnSuggestion(
  input: SuggestWorkOnInput
): Promise<SuggestWorkOnResult> {
  const def = getChatSuggestionDef("work_on");
  const userText = def?.userText ?? "What should I work on";

  const now = new Date();
  const localHour = getLocalHour(now, input.tzOffsetMinutes);
  const nudgeHour = nudgeThresholdHour();

  const [settingsRow, incompleteRows, triageRows, top3Rows, timeEntryRows] = await Promise.all([
    db
      .select({
        dayStartHour: appSettings.dayStartHour,
        dayEndHour: appSettings.dayEndHour,
      })
      .from(appSettings)
      .where(eq(appSettings.userId, input.userId))
      .limit(1),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        scheduledDate: tasks.scheduledDate,
        bucketOverride: tasks.bucketOverride,
        isTop3: tasks.isTop3,
        top3Order: tasks.top3Order,
        top3PinnedAt: tasks.top3PinnedAt,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, input.userId), isNull(tasks.completedAt))),
    db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, input.userId),
          isNull(tasks.completedAt),
          isNotNull(tasks.scheduledDate),
          lt(tasks.scheduledDate, input.localDate),
          or(isNull(tasks.bucketOverride), ne(tasks.bucketOverride, "later"))
        )
      ),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        top3Order: tasks.top3Order,
        top3PinnedAt: tasks.top3PinnedAt,
        scheduledDate: tasks.scheduledDate,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(eq(tasks.userId, input.userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order))
      ),
    db
      .select({
        taskId: taskTimeEntries.taskId,
        startedAt: taskTimeEntries.startedAt,
      })
      .from(taskTimeEntries)
      .where(eq(taskTimeEntries.userId, input.userId)),
  ]);

  const dayStartHour = settingsRow[0]?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const dayEndHour = settingsRow[0]?.dayEndHour ?? DEFAULT_DAY_END_HOUR;

  const triageIds = new Set(triageRows.map((r) => r.id));

  const activeTop3Ids = new Set(
    top3Rows
      .filter((row) => isTop3ActiveForLocalDate(row, input.localDate, input.tzOffsetMinutes))
      .map((row) => row.id)
  );

  const focusedTodayTaskIds = new Set(
    timeEntryRows
      .filter((e) => startedOnLocalDay(e.startedAt, input.localDate, input.tzOffsetMinutes))
      .map((e) => e.taskId)
  );

  const stalledTop3 = top3Rows
    .filter(
      (row) =>
        row.top3Order !== null &&
        row.completedAt === null &&
        isTop3ActiveForLocalDate(row, input.localDate, input.tzOffsetMinutes) &&
        !focusedTodayTaskIds.has(row.id)
    )
    .map((row) => ({
      id: row.id,
      title: row.title,
      top3Order: row.top3Order!,
    }));

  const todayPool = incompleteRows
    .filter((row) => !triageIds.has(row.id) && matchesTodayList(row, input.localDate))
    .map((row) => ({
      id: row.id,
      title: row.title,
      priority: row.priority,
      isTop3: activeTop3Ids.has(row.id),
      top3Order: activeTop3Ids.has(row.id) ? row.top3Order : null,
      completedAt: row.completedAt,
    }));

  const { pick } = pickWorkOnTask(todayPool, {
    localHour,
    dayStartHour,
    dayEndHour,
    lastWasLarge: input.lastWasLarge,
    stalledTop3,
  });

  const assistantText = formatWorkOnReply({
    pick: pick ? { title: pick.title, pickReason: pick.pickReason } : null,
    stalledTop3: stalledTop3.map((t) => ({ title: t.title, top3Order: t.top3Order })),
    localHour,
    nudgeThresholdHour: nudgeHour,
  });

  return {
    userText,
    assistantText,
    pick,
    lastWasLarge: pick?.isTop3 ?? false,
  };
}
