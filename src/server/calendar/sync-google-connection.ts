import "server-only";

import { and, eq, lt, or, gt } from "drizzle-orm";

import { db } from "@/db";
import { calendarConnections, externalCalendarEvents } from "@/db/tables";

import type { CalendarConnectionRow } from "./connection-store";
import { ensureFreshGoogleAccessToken, markGoogleConnectionError } from "./connection-store";
import { listGoogleCalendars, listGoogleEventsIncremental } from "./google-client";
import { normalizeGoogleEvent } from "./normalize-google-event";

const FULL_SYNC_DAYS_BACK = 90;
const FULL_SYNC_DAYS_FORWARD = 180;

type SyncCursorMap = Record<string, string>;

export type GoogleConnectionSyncResult = {
  connectionId: string;
  calendarsSynced: number;
  calendarsFailed: number;
  eventsUpserted: number;
  eventsDeleted: number;
  calendarErrors: Array<{ calendarId: string; message: string }>;
};

function parseSyncCursor(raw: string | null): SyncCursorMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const map: SyncCursorMap = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") map[key] = value;
      }
      return map;
    }
  } catch {
    // Legacy or corrupt cursor — treat as empty and full-resync.
  }
  return {};
}

function serializeSyncCursor(map: SyncCursorMap): string {
  return JSON.stringify(map);
}

function fullSyncWindow(): { timeMin: Date; timeMax: Date } {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - FULL_SYNC_DAYS_BACK);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + FULL_SYNC_DAYS_FORWARD);
  return { timeMin, timeMax };
}

async function syncCalendarEvents(
  connection: CalendarConnectionRow,
  accessToken: string,
  calendarId: string,
  calendarName: string | null,
  syncToken: string | undefined,
  now: Date
): Promise<{
  eventsUpserted: number;
  eventsDeleted: number;
  nextSyncToken: string | null;
}> {
  const needsFullSync = !syncToken;
  const { timeMin, timeMax } = fullSyncWindow();

  let page = needsFullSync
    ? await listGoogleEventsIncremental(accessToken, calendarId, { timeMin, timeMax })
    : await listGoogleEventsIncremental(accessToken, calendarId, { syncToken });

  if (page.fullSyncRequired) {
    page = await listGoogleEventsIncremental(accessToken, calendarId, { timeMin, timeMax });
  }

  const didFullSync = needsFullSync || page.fullSyncRequired;

  if (didFullSync) {
    await db
      .delete(externalCalendarEvents)
      .where(
        and(
          eq(externalCalendarEvents.connectionId, connection.id),
          eq(externalCalendarEvents.calendarId, calendarId),
          or(lt(externalCalendarEvents.endAt, timeMin), gt(externalCalendarEvents.startAt, timeMax))
        )
      );
  }

  let eventsUpserted = 0;
  let eventsDeleted = 0;

  for (const googleEvent of page.events) {
    const normalized = normalizeGoogleEvent(googleEvent, calendarId, calendarName);

    if (normalized.action === "skip") continue;

    if (normalized.action === "delete") {
      await db
        .delete(externalCalendarEvents)
        .where(
          and(
            eq(externalCalendarEvents.connectionId, connection.id),
            eq(externalCalendarEvents.calendarId, calendarId),
            eq(externalCalendarEvents.providerEventId, normalized.providerEventId)
          )
        );
      eventsDeleted += 1;
      continue;
    }

    await db
      .insert(externalCalendarEvents)
      .values({
        userId: connection.userId,
        connectionId: connection.id,
        ...normalized.row,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          externalCalendarEvents.connectionId,
          externalCalendarEvents.calendarId,
          externalCalendarEvents.providerEventId,
        ],
        set: {
          calendarName: normalized.row.calendarName,
          title: normalized.row.title,
          location: normalized.row.location,
          startAt: normalized.row.startAt,
          endAt: normalized.row.endAt,
          isAllDay: normalized.row.isAllDay,
          status: normalized.row.status,
          visibility: normalized.row.visibility,
          recurrenceMasterId: normalized.row.recurrenceMasterId,
          providerUpdatedAt: normalized.row.providerUpdatedAt,
          etag: normalized.row.etag,
          htmlLink: normalized.row.htmlLink,
          updatedAt: now,
        },
      });
    eventsUpserted += 1;
  }

  return {
    eventsUpserted,
    eventsDeleted,
    nextSyncToken: page.nextSyncToken,
  };
}

/** Sync all selected calendars for a Google connection. Per-calendar errors are isolated. */
export async function syncGoogleConnection(
  connection: CalendarConnectionRow
): Promise<GoogleConnectionSyncResult> {
  const selectedCalendarIds = connection.selectedCalendarIds ?? [];
  const result: GoogleConnectionSyncResult = {
    connectionId: connection.id,
    calendarsSynced: 0,
    calendarsFailed: 0,
    eventsUpserted: 0,
    eventsDeleted: 0,
    calendarErrors: [],
  };

  if (selectedCalendarIds.length === 0) return result;

  let accessToken: string;
  let activeConnection = connection;

  try {
    const fresh = await ensureFreshGoogleAccessToken(connection);
    accessToken = fresh.accessToken;
    activeConnection = fresh.connection;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refresh Google access token.";
    await markGoogleConnectionError(connection.id, message);
    throw err;
  }

  const cursorMap = parseSyncCursor(activeConnection.syncCursor);
  const now = new Date();

  let calendarNames: Map<string, string> = new Map();
  try {
    const calendars = await listGoogleCalendars(accessToken);
    calendarNames = new Map(calendars.map((cal) => [cal.id, cal.name]));
  } catch {
    // Name lookup is best-effort; sync can proceed without labels.
  }

  for (const calendarId of selectedCalendarIds) {
    try {
      const { eventsUpserted, eventsDeleted, nextSyncToken } = await syncCalendarEvents(
        activeConnection,
        accessToken,
        calendarId,
        calendarNames.get(calendarId) ?? null,
        cursorMap[calendarId],
        now
      );

      result.calendarsSynced += 1;
      result.eventsUpserted += eventsUpserted;
      result.eventsDeleted += eventsDeleted;

      if (nextSyncToken) {
        cursorMap[calendarId] = nextSyncToken;
      }
    } catch (err) {
      result.calendarsFailed += 1;
      const message = err instanceof Error ? err.message : "Calendar sync failed.";
      result.calendarErrors.push({ calendarId, message });
    }
  }

  const partialFailure = result.calendarErrors.length > 0;
  const allFailed =
    result.calendarsFailed > 0 && result.calendarsSynced === 0 && selectedCalendarIds.length > 0;

  await db
    .update(calendarConnections)
    .set({
      syncCursor: serializeSyncCursor(cursorMap),
      lastSyncedAt: result.calendarsSynced > 0 ? now : activeConnection.lastSyncedAt,
      status: allFailed ? "error" : "active",
      lastError: partialFailure
        ? result.calendarErrors.map((e) => `${e.calendarId}: ${e.message}`).join("; ")
        : null,
      updatedAt: now,
    })
    .where(eq(calendarConnections.id, connection.id));

  return result;
}
