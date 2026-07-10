import { NextResponse } from "next/server";

import { CALENDAR_SETTINGS_PATH } from "@/lib/calendar/constants";
import { getRouteUserId } from "@/server/claude/route-auth";
import {
  deleteGoogleConnection,
  getDecryptedRefreshToken,
} from "@/server/calendar/connection-store";
import { revokeGoogleToken } from "@/server/calendar/google-client";

export const dynamic = "force-dynamic";

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function POST() {
  const userId = await getRouteUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await deleteGoogleConnection(userId);
  if (connection) {
    try {
      await revokeGoogleToken(getDecryptedRefreshToken(connection));
    } catch {
      // Local row is already deleted; revocation failure is non-fatal.
    }
  }

  return NextResponse.redirect(new URL(CALENDAR_SETTINGS_PATH, getAppOrigin()));
}
