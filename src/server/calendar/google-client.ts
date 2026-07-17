import "server-only";

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

import { GOOGLE_CALENDAR_SCOPES } from "@/lib/calendar/constants";

import { getGoogleCalendarEnv } from "./env";

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiryDate: Date | null;
};

export type GoogleCalendarListItem = {
  id: string;
  name: string;
  primary: boolean;
  backgroundColor: string | null;
};

export type GoogleEventsPage = {
  events: calendar_v3.Schema$Event[];
  nextSyncToken: string | null;
  /** Google returned 410 — caller should discard syncToken and full-resync. */
  fullSyncRequired: boolean;
};

function createOAuth2Client(redirectUri?: string) {
  const env = getGoogleCalendarEnv();
  return new google.auth.OAuth2(
    env.GOOGLE_CALENDAR_CLIENT_ID,
    env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri ?? env.GOOGLE_CALENDAR_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state: string, redirectUri?: string): string {
  const client = createOAuth2Client(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_CALENDAR_SCOPES],
    state,
  });
}

export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri?: string
): Promise<{
  tokens: GoogleOAuthTokens;
  accountEmail: string;
}> {
  const client = createOAuth2Client(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google OAuth did not return access and refresh tokens.");
  }

  client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: client });
  const { data } = await calendar.calendarList.list({ minAccessRole: "reader" });
  const primary = data.items?.find((item) => item.primary);
  const accountEmail = primary?.id ?? primary?.summary ?? "unknown@gmail.com";

  return {
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    accountEmail,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Google token refresh did not return an access token.");
  }

  return {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token ?? refreshToken,
    expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
  };
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const client = createOAuth2Client();
  await client.revokeToken(token);
}

export async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendarListItem[]> {
  const client = createOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: client });
  const { data } = await calendar.calendarList.list({ minAccessRole: "reader" });
  return (data.items ?? [])
    .filter((item): item is calendar_v3.Schema$CalendarListEntry & { id: string } =>
      Boolean(item.id)
    )
    .map((item) => ({
      id: item.id,
      name: item.summary ?? item.id,
      primary: item.primary ?? false,
      backgroundColor: item.backgroundColor ?? null,
    }));
}

export async function listGoogleEventsIncremental(
  accessToken: string,
  calendarId: string,
  options?: {
    syncToken?: string | null;
    timeMin?: Date;
    timeMax?: Date;
  }
): Promise<GoogleEventsPage> {
  const client = createOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: client });

  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  try {
    do {
      const { data } = await calendar.events.list({
        calendarId,
        syncToken: options?.syncToken ?? undefined,
        timeMin: options?.syncToken ? undefined : options?.timeMin?.toISOString(),
        timeMax: options?.syncToken ? undefined : options?.timeMax?.toISOString(),
        singleEvents: true,
        showDeleted: true,
        maxResults: 250,
        pageToken,
      });
      events.push(...(data.items ?? []));
      pageToken = data.nextPageToken ?? undefined;
      if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
    } while (pageToken);
  } catch (err) {
    const status =
      err && typeof err === "object" && "code" in err
        ? Number((err as { code: unknown }).code)
        : null;
    if (status === 410) {
      return { events: [], nextSyncToken: null, fullSyncRequired: true };
    }
    throw err;
  }

  return { events, nextSyncToken, fullSyncRequired: false };
}
