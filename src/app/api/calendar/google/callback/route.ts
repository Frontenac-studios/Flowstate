import { NextResponse } from "next/server";

import { CALENDAR_SETTINGS_PATH } from "@/lib/calendar/constants";
import { getRouteUserId } from "@/server/claude/route-auth";
import { upsertGoogleConnection } from "@/server/calendar/connection-store";
import { isGoogleCalendarConfigured } from "@/server/calendar/env";
import { exchangeGoogleAuthCode } from "@/server/calendar/google-client";
import { verifyOAuthState } from "@/server/calendar/oauth-state";

export const dynamic = "force-dynamic";

function settingsUrl(query: Record<string, string>): URL {
  const url = new URL(CALENDAR_SETTINGS_PATH, getAppOrigin());
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET(req: Request) {
  const sessionUserId = await getRouteUserId();
  if (!sessionUserId) {
    return NextResponse.redirect(settingsUrl({ calendar: "error", reason: "unauthorized" }));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(settingsUrl({ calendar: "error", reason: "not_configured" }));
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(settingsUrl({ calendar: "error", reason: error }));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(settingsUrl({ calendar: "error", reason: "missing_code" }));
  }

  const userIdFromState = verifyOAuthState(state);
  if (!userIdFromState || userIdFromState !== sessionUserId) {
    return NextResponse.redirect(settingsUrl({ calendar: "error", reason: "invalid_state" }));
  }

  try {
    const { tokens, accountEmail } = await exchangeGoogleAuthCode(code);
    await upsertGoogleConnection(sessionUserId, accountEmail, tokens);
    return NextResponse.redirect(settingsUrl({ calendar: "connected" }));
  } catch (err) {
    const reason = err instanceof Error ? err.message : "exchange_failed";
    return NextResponse.redirect(settingsUrl({ calendar: "error", reason }));
  }
}
