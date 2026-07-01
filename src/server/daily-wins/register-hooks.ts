import "server-only";

import { and, eq, gte, isNotNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { careEvents, dailyWins, tasks } from "@/db/tables";
import { buildTop3Status } from "@/lib/eod/build-top3-status";
import { countCompletionsToday } from "@/lib/eod/count-completions-today";
import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";
import type { ReflectionBeatDayContext } from "@/lib/daily-wins/reflection-beat";

import { generateReflectionBeat } from "../claude/generate-reflection-beat";
import { fetchDailyWinProposals } from "./fetch-proposals";

async function fetchReflectionBeatContext(
  userId: string,
  winDate: string,
  tzOffsetMinutes: number
): Promise<ReflectionBeatDayContext> {
  const { start, end } = localDayUtcBounds(winDate, tzOffsetMinutes);

  const [top3Rows, completedRows, careCountRows, acceptedRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        top3Order: tasks.top3Order,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order))),
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
      .select({ id: careEvents.id })
      .from(careEvents)
      .where(
        and(
          eq(careEvents.userId, userId),
          gte(careEvents.occurredAt, start),
          lt(careEvents.occurredAt, end)
        )
      ),
    db
      .select({ id: dailyWins.id })
      .from(dailyWins)
      .where(
        and(
          eq(dailyWins.userId, userId),
          eq(dailyWins.winDate, winDate),
          eq(dailyWins.state, "accepted")
        )
      ),
  ]);

  const top3Status = buildTop3Status(top3Rows);
  const top3DoneCount = top3Status.slots.filter((slot) => slot.status === "done").length;

  return {
    winDate,
    completionsToday: countCompletionsToday(completedRows, winDate, tzOffsetMinutes),
    top3DoneCount,
    careEventCount: careCountRows.length,
    acceptedWinCount: acceptedRows.length,
  };
}

/** Reflection register EoD wins beat — supplements F1 ranked proposals + one gentle prompt. */
export async function proposeReflectionBeat(
  userId: string,
  winDate: string,
  tzOffsetMinutes: number
) {
  const [baseProposals, dayContext] = await Promise.all([
    fetchDailyWinProposals(userId, winDate, tzOffsetMinutes),
    fetchReflectionBeatContext(userId, winDate, tzOffsetMinutes),
  ]);

  return generateReflectionBeat({ userId, baseProposals, dayContext });
}
