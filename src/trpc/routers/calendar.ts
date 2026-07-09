import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { calendarConnections } from "@/db/tables";
import {
  ensureFreshGoogleAccessToken,
  getGoogleConnection,
} from "@/server/calendar/connection-store";
import { isGoogleCalendarConfigured } from "@/server/calendar/env";
import { listGoogleCalendars } from "@/server/calendar/google-client";
import { syncGoogleConnection } from "@/server/calendar/sync-google-connection";

import { createTRPCRouter, protectedProcedure } from "../init";

const calendarSelectionSchema = z.object({
  calendarIds: z.array(z.string().min(1)),
});

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
