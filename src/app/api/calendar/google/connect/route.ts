import { NextResponse } from "next/server";

import { CALENDAR_SETTINGS_PATH } from "@/lib/calendar/constants";
import { getRouteUserId } from "@/server/claude/route-auth";
import { isGoogleCalendarConfigured } from "@/server/calendar/env";
import { getGoogleAuthUrl } from "@/server/calendar/google-client";
import { signOAuthState } from "@/server/calendar/oauth-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getRouteUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", getAppOrigin()));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL(`${CALENDAR_SETTINGS_PATH}?calendar=error&reason=not_configured`, getAppOrigin())
    );
  }

  const state = signOAuthState(userId);
  const authUrl = getGoogleAuthUrl(state);
  return NextResponse.redirect(authUrl);
}

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
