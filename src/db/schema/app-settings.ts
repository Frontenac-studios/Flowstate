import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { GoalCoachAdaptations } from "@/lib/settings/constants";
import { projectCategory } from "./projects";
export const appSettings = pgTable("app_settings", {
  userId: uuid("user_id").primaryKey(),
  bucketMode: text("bucket_mode").notNull().default("relative"),
  dayStartHour: integer("day_start_hour").notNull().default(7),
  dayEndHour: integer("day_end_hour").notNull().default(19),
  lastUsedCategory: projectCategory("last_used_category"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  focusDndEnabled: boolean("focus_dnd_enabled").notNull().default(true),
  assistanceEnabled: boolean("assistance_enabled").notNull().default(true),
  morningHandoff: text("morning_handoff").notNull().default("on"),
  goalSteering: text("goal_steering").notNull().default("on"),
  balanceNudge: text("balance_nudge").notNull().default("on"),
  /** Goals-coach ambition dial (gentle|balanced|stretch) — how bold its suggestions run. */
  goalCoachAmbition: text("goal_coach_ambition").notNull().default("balanced"),
  /** Free-text steer for the goals coach ("keep it gentle", "avoid Adulting", …). */
  goalCoachNote: text("goal_coach_note"),
  /**
   * J3 learned adaptations — categories the user consented (in coach chat) to ease off.
   * Null until the first surface-and-ask agreement; never written silently.
   */
  goalCoachAdaptations: jsonb("goal_coach_adaptations").$type<GoalCoachAdaptations>(),
  evidenceCadence: text("evidence_cadence").notNull().default("quarterly"),
  abyssArchiveAfterDays: integer("abyss_archive_after_days"),
  top3MiddayCheckin: text("top3_midday_checkin").notNull().default("on"),
  calendarAiEnabled: boolean("calendar_ai_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
