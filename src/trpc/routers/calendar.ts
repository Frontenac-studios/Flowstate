import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, lt, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { calendarConnections, externalCalendarEvents } from "@/db/tables";
import { sumBusyMinutes } from "@/lib/calendar/build-day-busy-intervals";
import { eventToDayMinutes } from "@/lib/calendar/event-to-day-minutes";
import { CALENDAR_SYNC_FRESH_MS } from "@/lib/calendar/oauth-redirect";
import { redactEventFields } from "@/lib/calendar/redact-event";
import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";
import {
  ensureFreshGoogleAccessToken,
  getGoogleConnection,
} from "@/server/calendar/connection-store";
import { isGoogleCalendarConfigured } from "@/server/calendar/env";
import { listGoogleCalendars } from "@/server/calendar/google-client";
import { syncGoogleConnection } from "@/server/calendar/sync-google-connection";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const tzOffsetSchema = z.number().int().min(-840).max(840);

const calendarSelectionSchema = z.object({
  calendarIds: z.array(z.string().min(1)),
});

const calendarDateInputSchema = z.object({
  date: isoDateSchema,
  tzOffsetMinutes: tzOffsetSchema,
});

const calendarWeekInputSchema = z.object({
  anchorDate: isoDateSchema,
  tzOffsetMinutes: tzOffsetSchema,
});

export type TimelineSyncStatus = "off" | "on" | "error";

type ExternalEventRow = {
  id: string;
  calendarId: string;
  calendarName: string | null;
  calendarColor: string | null;
  title: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  status: "confirmed" | "tentative" | "cancelled";
  visibility: "public" | "private" | "default";
  htmlLink: string | null;
};

export type EventForDay = {
  id: string;
  calendarId: string;
  calendarName: string | null;
  calendarColor: string | null;
  title: string | null;
  location: string | null;
  startMin: number;
  endMin: number;
  isAllDay: boolean;
  status: "confirmed" | "tentative" | "cancelled";
  visibility: "public" | "private" | "default";
  htmlLink: string | null;
};

function weekDateRange(anchorDate: string): string[] {
  return datesInIsoWeek(parseISODateString(anchorDate)).map(toISODateString);
}

function weekUtcBounds(
  anchorDate: string,
  tzOffsetMinutes: number
): { start: Date; end: Date; dates: string[] } {
  const dates = weekDateRange(anchorDate);
  const { start } = localDayUtcBounds(dates[0]!, tzOffsetMinutes);
  const { end } = localDayUtcBounds(dates[dates.length - 1]!, tzOffsetMinutes);
  return { start, end, dates };
}

async function fetchOverlappingEvents(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<ExternalEventRow[]> {
  return db
    .select({
      id: externalCalendarEvents.id,
      calendarId: externalCalendarEvents.calendarId,
      calendarName: externalCalendarEvents.calendarName,
      calendarColor: externalCalendarEvents.calendarColor,
      title: externalCalendarEvents.title,
      location: externalCalendarEvents.location,
      startAt: externalCalendarEvents.startAt,
      endAt: externalCalendarEvents.endAt,
      isAllDay: externalCalendarEvents.isAllDay,
      status: externalCalendarEvents.status,
      visibility: externalCalendarEvents.visibility,
      htmlLink: externalCalendarEvents.htmlLink,
    })
    .from(externalCalendarEvents)
    .where(
      and(
        eq(externalCalendarEvents.userId, userId),
        ne(externalCalendarEvents.status, "cancelled"),
        lt(externalCalendarEvents.startAt, rangeEnd),
        gt(externalCalendarEvents.endAt, rangeStart)
      )
    )
    .orderBy(asc(externalCalendarEvents.startAt));
}

function toEventForDay(
  row: ExternalEventRow,
  localDate: string,
  tzOffsetMinutes: number
): EventForDay | null {
  const geometry = eventToDayMinutes(row, localDate, tzOffsetMinutes);
  if (!geometry) return null;

  return {
    id: row.id,
    calendarId: row.calendarId,
    calendarName: row.calendarName,
    calendarColor: row.calendarColor,
    ...redactEventFields(row),
    startMin: geometry.startMin,
    endMin: geometry.endMin,
    isAllDay: row.isAllDay,
    status: row.status,
    htmlLink: row.htmlLink,
  };
}

function resolveSyncStatus(connection: {
  status: "active" | "error" | "disconnected";
  selectedCalendarIds: string[] | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
}): TimelineSyncStatus {
  if (connection.status === "disconnected") return "off";
  if ((connection.selectedCalendarIds ?? []).length === 0) return "off";
  if (connection.status === "error" || (connection.lastError?.trim().length ?? 0) > 0) {
    return "error";
  }
  if (
    connection.status === "active" &&
    connection.lastSyncedAt != null &&
    Date.now() - connection.lastSyncedAt.getTime() < CALENDAR_SYNC_FRESH_MS
  ) {
    return "on";
  }
  return "off";
}

export const calendarRouter = createTRPCRouter({
  connections: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      const connection = await getGoogleConnection(ctx.userId);
      if (!connection) {
        return {
          connected: false as const,
          configured: isGoogleCalendarConfigured(),
          accountEmail: null,
          status: null,
          selectedCalendarIds: [] as string[],
          lastSyncedAt: null,
          lastError: null,
        };
      }

      return {
        connected: true as const,
        configured: isGoogleCalendarConfigured(),
        accountEmail: connection.accountEmail,
        status: connection.status,
        selectedCalendarIds: connection.selectedCalendarIds ?? [],
        lastSyncedAt: connection.lastSyncedAt,
        lastError: connection.lastError,
      };
    }),

    syncNow: protectedProcedure.mutation(async ({ ctx }) => {
      if (!isGoogleCalendarConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Calendar OAuth is not configured.",
        });
      }

      const connection = await getGoogleConnection(ctx.userId);
      if (!connection || connection.status === "disconnected") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Google Calendar connection found.",
        });
      }

      if ((connection.selectedCalendarIds ?? []).length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Select at least one calendar before syncing.",
        });
      }

      return syncGoogleConnection(connection);
    }),

    getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
      const connection = await getGoogleConnection(ctx.userId);
      if (!connection) {
        return {
          status: "off" as const,
          lastSyncedAt: null,
          lastError: null,
          accountEmail: null,
        };
      }

      return {
        status: resolveSyncStatus(connection),
        lastSyncedAt: connection.lastSyncedAt,
        lastError: connection.lastError,
        accountEmail: connection.accountEmail,
      };
    }),
  }),

  events: createTRPCRouter({
    listForDate: protectedProcedure.input(calendarDateInputSchema).query(async ({ ctx, input }) => {
      const { start, end } = localDayUtcBounds(input.date, input.tzOffsetMinutes);
      const rows = await fetchOverlappingEvents(ctx.userId, start, end);

      return rows
        .map((row) => toEventForDay(row, input.date, input.tzOffsetMinutes))
        .filter((event): event is EventForDay => event != null);
    }),

    listForWeek: protectedProcedure.input(calendarWeekInputSchema).query(async ({ ctx, input }) => {
      const { start, end, dates } = weekUtcBounds(input.anchorDate, input.tzOffsetMinutes);
      const rows = await fetchOverlappingEvents(ctx.userId, start, end);

      const grouped = Object.fromEntries(
        dates.map((date) => [date, [] as EventForDay[]])
      ) as Record<string, EventForDay[]>;

      for (const row of rows) {
        for (const date of dates) {
          const event = toEventForDay(row, date, input.tzOffsetMinutes);
          if (event) grouped[date]!.push(event);
        }
      }

      for (const date of dates) {
        grouped[date]!.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
      }

      return grouped;
    }),

    getDaySummary: protectedProcedure
      .input(calendarDateInputSchema)
      .query(async ({ ctx, input }) => {
        const { start, end } = localDayUtcBounds(input.date, input.tzOffsetMinutes);
        const rows = await fetchOverlappingEvents(ctx.userId, start, end);

        let timedEventCount = 0;
        let allDayEventCount = 0;
        let privateEventCount = 0;
        const timedIntervals: { startMin: number; endMin: number }[] = [];

        for (const row of rows) {
          const geometry = eventToDayMinutes(row, input.date, input.tzOffsetMinutes);
          if (!geometry) continue;

          if (row.isAllDay) {
            allDayEventCount += 1;
          } else {
            timedEventCount += 1;
            timedIntervals.push(geometry);
          }

          if (row.visibility === "private") {
            privateEventCount += 1;
          }
        }

        return {
          eventCount: timedEventCount + allDayEventCount,
          timedEventCount,
          allDayEventCount,
          busyMinutes: sumBusyMinutes(timedIntervals),
          privateEventCount,
        };
      }),
  }),

  calendars: createTRPCRouter({
    listAvailable: protectedProcedure.query(async ({ ctx }) => {
      if (!isGoogleCalendarConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Calendar OAuth is not configured.",
        });
      }

      const connection = await getGoogleConnection(ctx.userId);
      if (!connection || connection.status === "disconnected") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Google Calendar connection found.",
        });
      }

      const { accessToken } = await ensureFreshGoogleAccessToken(connection);
      return listGoogleCalendars(accessToken);
    }),

    updateSelection: protectedProcedure
      .input(calendarSelectionSchema)
      .mutation(async ({ ctx, input }) => {
        const connection = await getGoogleConnection(ctx.userId);
        if (!connection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No Google Calendar connection found.",
          });
        }

        const uniqueIds = Array.from(new Set(input.calendarIds));
        const [row] = await db
          .update(calendarConnections)
          .set({
            selectedCalendarIds: uniqueIds,
            syncCursor: null,
            status: "active",
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(calendarConnections.id, connection.id))
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update calendar selection.",
          });
        }

        return { selectedCalendarIds: uniqueIds };
      }),
  }),
});
