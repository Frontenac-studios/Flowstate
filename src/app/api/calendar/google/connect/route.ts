import { NextResponse } from "next/server";

import { resolveCalendarOAuthRedirectUri } from "@/lib/calendar/oauth-redirect";
import { requestOriginFromHeaders } from "@/lib/calendar/request-origin";
import { calendarSettingsUrl } from "@/lib/calendar/settings-redirect";
import { getRouteUserId } from "@/server/claude/route-auth";
import { getGoogleCalendarEnv, isGoogleCalendarConfigured } from "@/server/calendar/env";
import { getGoogleAuthUrl } from "@/server/calendar/google-client";
import { signOAuthState } from "@/server/calendar/oauth-state";

export const dynamic = "force-dynamic";

function getAppOrigin(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      // fall through
    }
  }
  return requestOriginFromHeaders(req);
}

export async function GET(req: Request) {
  const userId = await getRouteUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", getAppOrigin(req)));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      calendarSettingsUrl(getAppOrigin(req), {
        calendar: "error",
        reason: "not_configured",
      })
    );
  }

  const env = getGoogleCalendarEnv();
  const redirectUri = resolveCalendarOAuthRedirectUri(
    requestOriginFromHeaders(req),
    env.GOOGLE_CALENDAR_REDIRECT_URI
  );
  const state = signOAuthState(userId);
  const authUrl = getGoogleAuthUrl(state, redirectUri);
  return NextResponse.redirect(authUrl);
}
