import { z } from "zod";

import { PROJECT_CATEGORIES } from "@/lib/projects/categories";

export const bucketModeSchema = z.enum(["relative", "named_days"]);
export type BucketMode = z.infer<typeof bucketModeSchema>;
export const DEFAULT_BUCKET_MODE: BucketMode = "relative";
export const DEFAULT_DAY_START_HOUR = 7;
export const DEFAULT_DAY_END_HOUR = 19;
const dayHourSchema = z.number().int().min(0).max(23);
export const workingHoursSchema = z
  .object({ dayStartHour: dayHourSchema, dayEndHour: dayHourSchema })
  .refine((s) => s.dayStartHour < s.dayEndHour, {
    message: "Day start must be before day end.",
    path: ["dayEndHour"],
  });
export type WorkingHours = z.infer<typeof workingHoursSchema>;
export const notificationPrefsSchema = z.object({
  notificationsEnabled: z.boolean(),
  focusDndEnabled: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

/**
 * Per-type switches for the W2d threshold alerts (Law 3 — each individually
 * switchable). Stored as one jsonb blob so a new alert type is a code change, not
 * a migration. A missing key resolves to on, so existing users default to all-on.
 */
export const alertPrefsSchema = z.object({
  longTimer: z.boolean(),
  clientThreshold: z.boolean(),
  projectOverEstimate: z.boolean(),
  weeklyHours: z.boolean(),
});
export type AlertPrefs = z.infer<typeof alertPrefsSchema>;
export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  longTimer: true,
  clientThreshold: true,
  projectOverEstimate: true,
  weeklyHours: true,
};
export function resolveAlertPrefs(raw: unknown): AlertPrefs {
  const parsed = alertPrefsSchema.partial().safeParse(raw);
  return { ...DEFAULT_ALERT_PREFS, ...(parsed.success ? parsed.data : {}) };
}

export const top3MiddayCheckinSchema = z.enum(["on", "off"]);
export type Top3MiddayCheckin = z.infer<typeof top3MiddayCheckinSchema>;
export const DEFAULT_TOP3_MIDDAY_CHECKIN: Top3MiddayCheckin = "on";

export const goalCoachAmbitionSchema = z.enum(["gentle", "balanced", "stretch"]);
export type GoalCoachAmbition = z.infer<typeof goalCoachAmbitionSchema>;
export const DEFAULT_GOAL_COACH_AMBITION: GoalCoachAmbition = "balanced";

export const GOAL_COACH_NOTE_MAX = 500;
export const goalCoachNoteSchema = z.string().max(GOAL_COACH_NOTE_MAX);
export const DEFAULT_GOAL_COACH_NOTE = "";

/**
 * J3 learned adaptations: categories the user explicitly consented (in coach chat) to
 * have the coach ease off. Only ever written after a surface-and-ask exchange — never
 * silent. `eased` holds the consented categories; the user can lift them any time.
 */
export const goalCoachAdaptationsSchema = z.object({
  eased: z.array(z.enum(PROJECT_CATEGORIES)).default([]),
});
export type GoalCoachAdaptations = z.infer<typeof goalCoachAdaptationsSchema>;
export const DEFAULT_GOAL_COACH_ADAPTATIONS: GoalCoachAdaptations = { eased: [] };

export const calendarAiEnabledSchema = z.boolean();
export type CalendarAiEnabled = z.infer<typeof calendarAiEnabledSchema>;
export const DEFAULT_CALENDAR_AI_ENABLED = true;

/**
 * The declared quarter tilt (W6, the Budget): business share of logged time as a
 * whole percentage; personal is the remainder. Null (never declared) is the unset
 * state and lives on the row, not here — this schema only guards a real declaration.
 */
export const quarterTiltBusinessPctSchema = z.number().int().min(0).max(100);
export type QuarterTiltBusinessPct = z.infer<typeof quarterTiltBusinessPctSchema>;
