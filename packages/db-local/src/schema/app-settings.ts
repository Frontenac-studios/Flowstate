import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PROJECT_CATEGORIES } from "./projects";
import { sqliteNow } from "../sqlite-defaults";
export const appSettings = sqliteTable("app_settings", {
  userId: text("user_id").primaryKey(),
  bucketMode: text("bucket_mode").notNull().default("relative"),
  dayStartHour: integer("day_start_hour").notNull().default(7),
  dayEndHour: integer("day_end_hour").notNull().default(19),
  lastUsedCategory: text("last_used_category", { enum: PROJECT_CATEGORIES }),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  focusDndEnabled: integer("focus_dnd_enabled", { mode: "boolean" }).notNull().default(true),
  assistanceEnabled: integer("assistance_enabled", { mode: "boolean" }).notNull().default(true),
  morningHandoff: text("morning_handoff").notNull().default("on"),
  goalSteering: text("goal_steering").notNull().default("on"),
  balanceNudge: text("balance_nudge").notNull().default("on"),
  goalCoachAmbition: text("goal_coach_ambition").notNull().default("balanced"),
  goalCoachNote: text("goal_coach_note"),
  goalCoachAdaptations: text("goal_coach_adaptations", { mode: "json" }),
  evidenceCadence: text("evidence_cadence").notNull().default("quarterly"),
  abyssArchiveAfterDays: integer("abyss_archive_after_days"),
  top3MiddayCheckin: text("top3_midday_checkin").notNull().default("on"),
  calendarAiEnabled: integer("calendar_ai_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => sqliteNow()),
});
