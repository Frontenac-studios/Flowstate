import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { isSqliteMode } from "@/db/mode";
import { calendarConnections } from "@/db/tables";
import { syncGoogleConnection } from "@/server/calendar/sync-google-connection";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? process.env.CALENDAR_SYNC_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Calendar sync tables are Postgres-only; desktop has no local mirror yet.
  if (isSqliteMode()) {
    return NextResponse.json({
      connectionsEligible: 0,
      connectionsSynced: 0,
      connectionsFailed: 0,
      eventsUpserted: 0,
      eventsDeleted: 0,
      errors: [],
    });
  }

  const connections = await db
    .select()
    .from(calendarConnections)
    .where(inArray(calendarConnections.status, ["active", "error"]));

  const eligible = connections.filter((row) => (row.selectedCalendarIds ?? []).length > 0);

  let connectionsSynced = 0;
  let connectionsFailed = 0;
  let eventsUpserted = 0;
  let eventsDeleted = 0;
  const errors: Array<{ connectionId: string; message: string }> = [];

  for (const connection of eligible) {
    try {
      const result = await syncGoogleConnection(connection);
      connectionsSynced += 1;
      eventsUpserted += result.eventsUpserted;
      eventsDeleted += result.eventsDeleted;

      if (result.calendarErrors.length > 0) {
        errors.push({
          connectionId: connection.id,
          message: result.calendarErrors.map((e) => `${e.calendarId}: ${e.message}`).join("; "),
        });
      }
    } catch (err) {
      connectionsFailed += 1;
      errors.push({
        connectionId: connection.id,
        message: err instanceof Error ? err.message : "Connection sync failed.",
      });
    }
  }

  return NextResponse.json({
    connectionsEligible: eligible.length,
    connectionsSynced,
    connectionsFailed,
    eventsUpserted,
    eventsDeleted,
    errors,
  });
}
