import { CALENDAR_SETTINGS_PATH } from "./constants";

/** Build a Settings → Integrations URL, optionally with calendar OAuth flash params. */
export function calendarSettingsUrl(origin: string, query: Record<string, string> = {}): URL {
  const url = new URL(CALENDAR_SETTINGS_PATH, origin);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}
