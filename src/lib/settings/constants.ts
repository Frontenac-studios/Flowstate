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

export const abyssArchiveAfterDaysSchema = z.number().int().min(1).max(365);
export type AbyssArchiveAfterDays = z.infer<typeof abyssArchiveAfterDaysSchema>;
export const DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS = 90;
