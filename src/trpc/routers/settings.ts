import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db";
import { appSettings } from "@/db/tables";
import {
  alertPrefsSchema,
  bucketModeSchema,
  calendarAiEnabledSchema,
  DEFAULT_BUCKET_MODE,
  DEFAULT_CALENDAR_AI_ENABLED,
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_GOAL_COACH_ADAPTATIONS,
  DEFAULT_GOAL_COACH_AMBITION,
  DEFAULT_GOAL_COACH_NOTE,
  DEFAULT_TOP3_MIDDAY_CHECKIN,
  goalCoachAdaptationsSchema,
  goalCoachAmbitionSchema,
  goalCoachNoteSchema,
  notificationPrefsSchema,
  quarterTiltBusinessPctSchema,
  resolveAlertPrefs,
  top3MiddayCheckinSchema,
  workingHoursSchema,
} from "@/lib/settings/constants";
import { createTRPCRouter, protectedProcedure } from "../init";

const assistanceSettingsSchema = z.object({
  assistanceEnabled: z.boolean(),
  top3MiddayCheckin: top3MiddayCheckinSchema,
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
      alertPrefs: resolveAlertPrefs(row.alertPrefs),
      assistanceEnabled: row.assistanceEnabled ?? true,
      top3MiddayCheckin: middayParsed.success ? middayParsed.data : DEFAULT_TOP3_MIDDAY_CHECKIN,
      calendarAiEnabled: row.calendarAiEnabled ?? DEFAULT_CALENDAR_AI_ENABLED,
      goalCoachAmbition: goalCoachAmbitionSchema.safeParse(row.goalCoachAmbition).success
        ? row.goalCoachAmbition
        : DEFAULT_GOAL_COACH_AMBITION,
      goalCoachNote: row.goalCoachNote ?? DEFAULT_GOAL_COACH_NOTE,
      goalCoachEased: goalCoachAdaptationsSchema.safeParse(row.goalCoachAdaptations).success
        ? goalCoachAdaptationsSchema.parse(row.goalCoachAdaptations).eased
        : DEFAULT_GOAL_COACH_ADAPTATIONS.eased,
      quarterFirstRunAt: row.quarterFirstRunAt ?? null,
      quarterTiltBusinessPct: row.quarterTiltBusinessPct ?? null,
    };
  }),

  /**
   * Declare (or redraw) the quarter time tilt (W6). Business share 0–100; personal
   * is the remainder. This is the only writer of the tilt — the Budget bar reads it.
   */
  setQuarterTilt: protectedProcedure
    .input(quarterTiltBusinessPctSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({ quarterTiltBusinessPct: input, updatedAt: new Date() })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update quarter tilt.",
        });
      return { quarterTiltBusinessPct: input };
    }),

  /** Dismiss the one-time Quarter guided first-run (W5). Idempotent. */
  dismissQuarterFirstRun: protectedProcedure.mutation(async ({ ctx }) => {
    await getOrCreateSettings(ctx.userId);
    await db
      .update(appSettings)
      .set({ quarterFirstRunAt: new Date(), updatedAt: new Date() })
      .where(eq(appSettings.userId, ctx.userId));
    return { ok: true };
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
  updateAlertPrefs: protectedProcedure.input(alertPrefsSchema).mutation(async ({ ctx, input }) => {
    await getOrCreateSettings(ctx.userId);
    const [row] = await db
      .update(appSettings)
      .set({ alertPrefs: input, updatedAt: new Date() })
      .where(eq(appSettings.userId, ctx.userId))
      .returning();
    if (!row)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update alert preferences.",
      });
    return input;
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
          top3MiddayCheckin: input.top3MiddayCheckin,
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
  updateGoalCoachPrefs: protectedProcedure
    .input(z.object({ ambition: goalCoachAmbitionSchema, note: goalCoachNoteSchema }))
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const trimmedNote = input.note.trim();
      const [row] = await db
        .update(appSettings)
        .set({
          goalCoachAmbition: input.ambition,
          goalCoachNote: trimmedNote.length > 0 ? trimmedNote : null,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update goals coach preferences.",
        });
      }
      return { ambition: input.ambition, note: trimmedNote };
    }),
  // J3 transparency: let the user see and prune what the coach has learned. The coach
  // adds eased categories via a consent-gated chat tool; this mutation is the "lift it"
  // control surfaced in Settings, so learning is never a black box.
  setGoalCoachAdaptations: protectedProcedure
    .input(goalCoachAdaptationsSchema)
    .mutation(async ({ ctx, input }) => {
      await getOrCreateSettings(ctx.userId);
      const [row] = await db
        .update(appSettings)
        .set({ goalCoachAdaptations: { eased: input.eased }, updatedAt: new Date() })
        .where(eq(appSettings.userId, ctx.userId))
        .returning();
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update goals coach adaptations.",
        });
      }
      return { eased: input.eased };
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
