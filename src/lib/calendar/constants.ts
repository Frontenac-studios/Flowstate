/** Read-only Google Calendar access for inbound sync. */
export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export const GOOGLE_CALENDAR_SCOPES = [GOOGLE_CALENDAR_READONLY_SCOPE] as const;

/** OAuth state param TTL — bind connect redirect to the initiating user. */
export const CALENDAR_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/** Settings Integrations tab — OAuth connect/callback/disconnect return here. */
export const CALENDAR_SETTINGS_PATH = "/settings?tab=integrations";
