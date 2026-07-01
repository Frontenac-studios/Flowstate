import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { dailyWins, tasks } from "@/db/tables";
import { formatWinLabel } from "@/lib/daily-wins/format-win-label";
import { computeHitRate } from "@/lib/daily-wins/hit-rate";
import { addDays, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { toLocalISODate } from "@/lib/nudges/local-time";

function recentLocalDates(todayIso: string, count: number): string[] {
  const dates: string[] = [];
  let cursor = parseISODateString(todayIso);
  for (let i = 0; i < count; i++) {
    dates.push(toISODateString(cursor));
    cursor = addDays(cursor, -1);
  }
  return dates;
}

export async function fetchRecentWinHistory(
  userId: string,
  opts: { days: number; hitRateWindow: number; tzOffsetMinutes: number }
) {
  const today = toLocalISODate(new Date(), opts.tzOffsetMinutes);
  const dates = recentLocalDates(today, opts.days);
  const hitRateDates = dates.slice(0, opts.hitRateWindow);

  if (dates.length === 0) {
    return {
      today,
      hitRate: computeHitRate(0, opts.hitRateWindow),
      days: [] as Array<{
        winDate: string;
        wins: Array<{ id: string; slot: number | null; source: string; label: string }>;
      }>,
    };
  }

  const rows = await db
    .select()
    .from(dailyWins)
    .where(
      and(
        eq(dailyWins.userId, userId),
        eq(dailyWins.state, "accepted"),
        inArray(dailyWins.winDate, dates)
      )
    );

  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byDate.get(row.winDate) ?? [];
    list.push(row);
    byDate.set(row.winDate, list);
  }

  const taskIds = rows
    .filter((row) => row.source === "task" && row.refId)
    .map((row) => row.refId as string);

  const taskTitles = new Map<string, string>();
  if (taskIds.length > 0) {
    const taskRows = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    for (const task of taskRows) {
      taskTitles.set(task.id, task.title);
    }
  }

  const days = dates
    .filter((winDate) => (byDate.get(winDate)?.length ?? 0) > 0)
    .map((winDate) => {
      const wins = (byDate.get(winDate) ?? []).sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));

      return {
        winDate,
        wins: wins.map((win) => ({
          id: win.id,
          slot: win.slot,
          source: win.source,
          label: formatWinLabel(
            win,
            win.source === "task" && win.refId ? taskTitles.get(win.refId) : null
          ),
        })),
      };
    });

  const daysWithWinsInWindow = hitRateDates.filter(
    (winDate) => (byDate.get(winDate)?.length ?? 0) > 0
  ).length;

  return {
    today,
    hitRate: computeHitRate(daysWithWinsInWindow, opts.hitRateWindow),
    days,
  };
}
