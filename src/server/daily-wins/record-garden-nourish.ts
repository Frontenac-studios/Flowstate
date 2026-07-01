import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { syncCareEventRow } from "@/db/record-sync-mutation";
import { careEvents, dailyWins } from "@/db/tables";
import type { GardenNourishBeat } from "@/lib/care/garden-nourish";

/** DW-5: record a garden nourishment drip for an accepted win; full_set on the third slot. */
export async function recordGardenNourishForWin(
  userId: string,
  dailyWinId: string,
  winDate: string
): Promise<{ beat: GardenNourishBeat }> {
  const [acceptedCountRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(dailyWins)
    .where(
      and(
        eq(dailyWins.userId, userId),
        eq(dailyWins.winDate, winDate),
        eq(dailyWins.state, "accepted")
      )
    );

  const acceptedCount = acceptedCountRow?.count ?? 0;
  const beat: GardenNourishBeat = acceptedCount >= 3 ? "full_set" : "drip";

  const [row] = await db
    .insert(careEvents)
    .values({
      userId,
      activityId: null,
      source: "daily_win",
      meta: { dailyWinId, winDate, beat } satisfies {
        dailyWinId: string;
        winDate: string;
        beat: GardenNourishBeat;
      },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to record garden nourishment for daily win.");
  }

  await syncCareEventRow(row.id, "insert", row);
  return { beat };
}
