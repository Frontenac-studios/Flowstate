import { z } from "zod";

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

export const abyssArchiveAfterDaysSchema = z.number().int().min(1).max(365);
export type AbyssArchiveAfterDays = z.infer<typeof abyssArchiveAfterDaysSchema>;
export const DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS = 90;

export const top3MiddayCheckinSchema = z.enum(["on", "off"]);
export type Top3MiddayCheckin = z.infer<typeof top3MiddayCheckinSchema>;
export const DEFAULT_TOP3_MIDDAY_CHECKIN: Top3MiddayCheckin = "on";

export const morningHandoffSchema = z.enum(["on", "off"]);
export type MorningHandoff = z.infer<typeof morningHandoffSchema>;
export const DEFAULT_MORNING_HANDOFF: MorningHandoff = "on";

export const goalSteeringSchema = z.enum(["on", "off"]);
export type GoalSteering = z.infer<typeof goalSteeringSchema>;
export const DEFAULT_GOAL_STEERING: GoalSteering = "on";

export const balanceNudgeSchema = z.enum(["on", "off"]);
export type BalanceNudge = z.infer<typeof balanceNudgeSchema>;
export const DEFAULT_BALANCE_NUDGE: BalanceNudge = "on";

export const evidenceCadenceSchema = z.enum(["monthly", "quarterly", "off"]);
export type EvidenceCadence = z.infer<typeof evidenceCadenceSchema>;
export const DEFAULT_EVIDENCE_CADENCE: EvidenceCadence = "quarterly";
