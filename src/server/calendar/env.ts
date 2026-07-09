import "server-only";

import { z } from "zod";

const googleCalendarEnvSchema = z.object({
  GOOGLE_CALENDAR_CLIENT_ID: z.string().min(1),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url(),
  CALENDAR_TOKEN_ENCRYPTION_KEY: z.string().min(1),
});

export type GoogleCalendarEnv = z.infer<typeof googleCalendarEnvSchema>;

export function getGoogleCalendarEnv(): GoogleCalendarEnv {
  const parsed = googleCalendarEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Google Calendar OAuth is not configured. Set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI, and CALENDAR_TOKEN_ENCRYPTION_KEY."
    );
  }
  return parsed.data;
}

export function isGoogleCalendarConfigured(): boolean {
  return googleCalendarEnvSchema.safeParse(process.env).success;
}
