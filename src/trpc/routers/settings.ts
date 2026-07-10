import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db";
import { appSettings } from "@/db/tables";
import {
  abyssArchiveAfterDaysSchema,
  balanceNudgeSchema,
  bucketModeSchema,
  calendarAiEnabledSchema,
  DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS,
  DEFAULT_BALANCE_NUDGE,
  DEFAULT_BUCKET_MODE,
  DEFAULT_CALENDAR_AI_ENABLED,
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_EVIDENCE_CADENCE,
  DEFAULT_GOAL_STEERING,
  DEFAULT_MORNING_HANDOFF,
  DEFAULT_TOP3_MIDDAY_CHECKIN,
  evidenceCadenceSchema,
  goalSteeringSchema,
  morningHandoffSchema,
  notificationPrefsSchema,
  top3MiddayCheckinSchema,
  workingHoursSchema,
} from "@/lib/settings/constants";
import { createTRPCRouter, protectedProcedure } from "../init";

const assistanceSettingsSchema = z.object({
  assistanceEnabled: z.boolean(),
  morningHandoff: morningHandoffSchema,
  goalSteering: goalSteeringSchema,
  balanceNudge: balanceNudgeSchema,
  top3MiddayCheckin: top3MiddayCheckinSchema,
  evidenceCadence: evidenceCadenceSchema,
});
async function getOrCreateSettings(userId: string) {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [inserted] = await db
    .insert(appSettings)
    .values({ userId, bucketMode: DEFAULT_BUCKET_MODE })
    .returning();
  if (!inserted)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create app settings.",
    });
  return inserted;
}
export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const row = await getOrCreateSettings(ctx.userId);
    const parsed = bucketModeSchema.safeParse(row.bucketMode);
    const middayParsed = top3MiddayCheckinSchema.safeParse(row.top3MiddayCheckin);
    return {
      bucketMode: parsed.success ? parsed.data : DEFAULT_BUCKET_MODE,
      dayStartHour: row.dayStartHour ?? DEFAULT_DAY_START_HOUR,
      dayEndHour: row.dayEndHour ?? DEFAULT_DAY_END_HOUR,
      lastUsedCategory: row.lastUsedCategory ?? null,
      notificationsEnabled: row.notificationsEnabled ?? true,
      focusDndEnabled: row.focusDndEnabled ?? true,
      assistanceEnabled: row.assistanceEnabled ?? true,
      morningHandoff: morningHandoffSchema.safeParse(row.morningHandoff).success
        ? row.morningHandoff
        : DEFAULT_MORNING_HANDOFF,
      goalSteering: goalSteeringSchema.safeParse(row.goalSteering).success
        ? row.goalSteering
        : DEFAULT_GOAL_STEERING,
      balanceNudge: balanceNudgeSchema.safeParse(row.balanceNudge).success
        ? row.balanceNudge
        : DEFAULT_BALANCE_NUDGE,
      evidenceCadence: evidenceCadenceSchema.safeParse(row.evidenceCadence).success
        ? row.evidenceCadence
        : DEFAULT_EVIDENCE_CADENCE,
      abyssArchiveAfterDays: row.abyssArchiveAfterDays ?? DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS,
      top3MiddayCheckin: middayParsed.success ? middayParsed.data : DEFAULT_TOP3_MIDDAY_CHECKIN,
      calendarAiEnabled: row.calendarAiEnabled ?? DEFAULT_CALENDAR_AI_ENABLED,
    };
  }),
  updateBucketMode: protectedProcedure.input(bucketModeSchema).mutation(async ({ ctx, input }) => {
    await getOrCreateSettings(ctx.userId);
    const [row] = await db
      .update(appSettings)
      .set({ bucketMode: input, updatedAt: new Date() })
      .where(eq(appSettings.userId, ctx.userId))
      .returning();
    if (!row)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update bucket mode.",
      });
    return { bucketMode: input };
  }),
  updateWorkingHours: protectedProcedure
    .input(workingHoursSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({
          dayStartHour: input.dayStartHour,
          dayEndHour: input.dayEndHour,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update working hours.",
        });
      return { dayStartHour: input.dayStartHour, dayEndHour: input.dayEndHour };
    }),
  updateNotificationPrefs: protectedProcedure
    .input(notificationPrefsSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({
          notificationsEnabled: input.notificationsEnabled,
          focusDndEnabled: input.focusDndEnabled,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update notification preferences.",
        });
      return {
        notificationsEnabled: input.notificationsEnabled,
        focusDndEnabled: input.focusDndEnabled,
      };
    }),
  updateAbyssArchiveAfterDays: protectedProcedure
    .input(abyssArchiveAfterDaysSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({ abyssArchiveAfterDays: input, updatedAt: new Date() })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update abyss archive threshold.",
        });
      return { abyssArchiveAfterDays: input };
    }),
  updateTop3MiddayCheckin: protectedProcedure
    .input(top3MiddayCheckinSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({ top3MiddayCheckin: input, updatedAt: new Date() })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update Top-3 midday check-in setting.",
        });
      return { top3MiddayCheckin: input };
    }),
  updateAssistanceSettings: protectedProcedure
    .input(assistanceSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({
          assistanceEnabled: input.assistanceEnabled,
          morningHandoff: input.morningHandoff,
          goalSteering: input.goalSteering,
          balanceNudge: input.balanceNudge,
          top3MiddayCheckin: input.top3MiddayCheckin,
          evidenceCadence: input.evidenceCadence,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update assistance settings.",
        });
      }
      return input;
    }),
  updateCalendarAiEnabled: protectedProcedure
    .input(calendarAiEnabledSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({ calendarAiEnabled: input, updatedAt: new Date() })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update calendar AI setting.",
        });
      return { calendarAiEnabled: input };
    }),
});
