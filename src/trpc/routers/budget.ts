import { and, eq, gt, gte, lt, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { appSettings, externalCalendarEvents, projects, timeEntries } from "@/db/tables";
import { buildDayBusyIntervals } from "@/lib/calendar/build-day-busy-intervals";
import { eventToDayMinutes } from "@/lib/calendar/event-to-day-minutes";
import { computeBudgetBar } from "@/lib/budget/compute-budget-bar";
import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import { getGoogleConnection } from "@/server/calendar/connection-store";
import type { Interval } from "@/lib/timeline/living-record";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * W6 — the Budget. The read behind Today's time bar: today's logged seconds split
 * business vs personal (by the entry's project category, so a project-only client
 * call counts just like a tasked one), held against the declared quarter tilt, plus
 * an optional free-vs-booked context from the read-only calendar.
 *
 * Tenancy note: `time_entries` is financial-class and the tilt lives on the
 * personal `app_settings` row; this read stays owner-scoped by `ctx.userId` and
 * derives everything at read — no money figure, no computed split, is ever written
 * back onto a shared row.
 */
export const budgetRouter = createTRPCRouter({
  today: protectedProcedure
    .input(
      z.object({
        localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = localDayUtcBounds(input.localDate, input.tzOffsetMinutes);

      const [settings] = await db
        .select({
          dayStartHour: appSettings.dayStartHour,
          dayEndHour: appSettings.dayEndHour,
          quarterTiltBusinessPct: appSettings.quarterTiltBusinessPct,
        })
        .from(appSettings)
        .where(eq(appSettings.userId, ctx.userId))
        .limit(1);

      const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
      const dayEndHour = settings?.dayEndHour ?? DEFAULT_DAY_END_HOUR;
      const tiltBusinessPct = settings?.quarterTiltBusinessPct ?? null;

      // Logged time today, split by project category. Direct join on projectId (not
      // via tasks) so project-only entries — a client call with no task — still count.
      const rows = await db
        .select({
          startedAt: timeEntries.startedAt,
          endedAt: timeEntries.endedAt,
          category: projects.category,
        })
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .where(
          and(
            eq(timeEntries.userId, ctx.userId),
            gte(timeEntries.startedAt, start),
            lt(timeEntries.startedAt, end)
          )
        );

      const now = new Date();
      let businessSeconds = 0;
      let personalSeconds = 0;
      for (const row of rows) {
        // A running entry (no endedAt) counts up to now, matching the timer UI.
        const endMs = (row.endedAt ?? now).getTime();
        const seconds = Math.max(0, Math.floor((endMs - row.startedAt.getTime()) / 1000));
        if (row.category === "business") businessSeconds += seconds;
        else personalSeconds += seconds;
      }

      // Capacity context is calendar-sourced, so it only appears when a calendar is
      // linked. Booked = accepted, timed events inside working hours; declined events
      // never reach the store and cancelled/all-day are dropped here. "Accepted" can't
      // yet be told from "tentative" (no stored response status — a W14 schema add), so
      // this counts every non-cancelled timed event; honest but slightly conservative.
      let bookedMinutes: number | null = null;
      let capacityMinutes: number | null = null;
      const connection = await getGoogleConnection(ctx.userId);
      if (connection && connection.status !== "disconnected") {
        const events = await db
          .select({
            startAt: externalCalendarEvents.startAt,
            endAt: externalCalendarEvents.endAt,
            isAllDay: externalCalendarEvents.isAllDay,
          })
          .from(externalCalendarEvents)
          .where(
            and(
              eq(externalCalendarEvents.userId, ctx.userId),
              ne(externalCalendarEvents.status, "cancelled"),
              lt(externalCalendarEvents.startAt, end),
              gt(externalCalendarEvents.endAt, start)
            )
          );

        const intervals: Interval[] = events
          .filter((event) => !event.isAllDay)
          .map((event) => eventToDayMinutes(event, input.localDate, input.tzOffsetMinutes))
          .filter((geometry): geometry is Interval => geometry != null);

        const busy = buildDayBusyIntervals(intervals, {
          fromMin: dayStartHour * 60,
          toMin: dayEndHour * 60,
        });
        bookedMinutes = busy.reduce(
          (total, interval) => total + (interval.endMin - interval.startMin),
          0
        );
        capacityMinutes = Math.max(0, (dayEndHour - dayStartHour) * 60);
      }

      return computeBudgetBar({
        businessSeconds,
        personalSeconds,
        tiltBusinessPct,
        bookedMinutes,
        capacityMinutes,
      });
    }),
});
