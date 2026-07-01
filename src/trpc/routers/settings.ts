import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { appSettings } from "@/db/tables";
import {
  abyssArchiveAfterDaysSchema,
  bucketModeSchema,
  DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS,
  DEFAULT_BUCKET_MODE,
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  notificationPrefsSchema,
  workingHoursSchema,
} from "@/lib/settings/constants";

import { createTRPCRouter, protectedProcedure } from "../init";

async function getOrCreateSettings(userId: string) {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [inserted] = await db
    .insert(appSettings)
    .values({ userId, bucketMode: DEFAULT_BUCKET_MODE })
    .returning();

  if (!inserted) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create app settings.",
    });
  }

  return inserted;
}

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const row = await getOrCreateSettings(ctx.userId);
    const parsed = bucketModeSchema.safeParse(row.bucketMode);
    return {
      bucketMode: parsed.success ? parsed.data : DEFAULT_BUCKET_MODE,
      dayStartHour: row.dayStartHour ?? DEFAULT_DAY_START_HOUR,
      dayEndHour: row.dayEndHour ?? DEFAULT_DAY_END_HOUR,
      // 1.4 habit layer: lets the composer preview the category a loose task will land on.
      lastUsedCategory: row.lastUsedCategory ?? null,
      notificationsEnabled: row.notificationsEnabled ?? true,
      focusDndEnabled: row.focusDndEnabled ?? true,
      abyssArchiveAfterDays: row.abyssArchiveAfterDays ?? DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS,
    };
  }),

  updateBucketMode: protectedProcedure.input(bucketModeSchema).mutation(async ({ ctx, input }) => {
    await getOrCreateSettings(ctx.userId);

    const [row] = await db
      .update(appSettings)
      .set({ bucketMode: input, updatedAt: new Date() })
      .where(eq(appSettings.userId, ctx.userId))
      .returning();

    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update bucket mode.",
      });
    }

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

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update working hours.",
        });
      }

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
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update abyss archive threshold.",
        });
      }
      return { abyssArchiveAfterDays: input };
    }),
});
