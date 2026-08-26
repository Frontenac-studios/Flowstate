import { NextResponse } from "next/server";

import { resolveCalendarOAuthRedirectUri } from "@/lib/calendar/oauth-redirect";
import { requestOriginFromHeaders } from "@/lib/calendar/request-origin";
import { calendarSettingsUrl } from "@/lib/calendar/settings-redirect";
import { getRouteUserId } from "@/server/claude/route-auth";
import { upsertGoogleConnection } from "@/server/calendar/connection-store";
import { getGoogleCalendarEnv, isGoogleCalendarConfigured } from "@/server/calendar/env";
import { exchangeGoogleAuthCode } from "@/server/calendar/google-client";
import { verifyOAuthState } from "@/server/calendar/oauth-state";

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

function settingsRedirect(req: Request, query: Record<string, string>): NextResponse {
  return NextResponse.redirect(calendarSettingsUrl(getAppOrigin(req), query));
}

export async function GET(req: Request) {
  const sessionUserId = await getRouteUserId();
  if (!sessionUserId) {
    return settingsRedirect(req, { calendar: "error", reason: "unauthorized" });
  }

  if (!isGoogleCalendarConfigured()) {
    return settingsRedirect(req, { calendar: "error", reason: "not_configured" });
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return settingsRedirect(req, { calendar: "error", reason: error });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return settingsRedirect(req, { calendar: "error", reason: "missing_code" });
  }

  const userIdFromState = verifyOAuthState(state);
  if (!userIdFromState || userIdFromState !== sessionUserId) {
    return settingsRedirect(req, { calendar: "error", reason: "invalid_state" });
  }

  try {
    const env = getGoogleCalendarEnv();
    const redirectUri = resolveCalendarOAuthRedirectUri(
      requestOriginFromHeaders(req),
      env.GOOGLE_CALENDAR_REDIRECT_URI
    );
    const { tokens, accountEmail } = await exchangeGoogleAuthCode(code, redirectUri);
    await upsertGoogleConnection(sessionUserId, accountEmail, tokens);
    return settingsRedirect(req, { calendar: "connected" });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "exchange_failed";
    return settingsRedirect(req, { calendar: "error", reason });
  }
}
