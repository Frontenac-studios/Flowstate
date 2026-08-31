import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AlertPrefs, GoalCoachAdaptations } from "@/lib/settings/constants";
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
  /** Goals-coach ambition dial (gentle|balanced|stretch) — how bold its suggestions run. */
  goalCoachAmbition: text("goal_coach_ambition").notNull().default("balanced"),
  /** Free-text steer for the goals coach ("keep it gentle", "avoid Adulting", …). */
  goalCoachNote: text("goal_coach_note"),
  /**
   * J3 learned adaptations — categories the user consented (in coach chat) to ease off.
   * Null until the first surface-and-ask agreement; never written silently.
   */
  goalCoachAdaptations: jsonb("goal_coach_adaptations").$type<GoalCoachAdaptations>(),
  abyssArchiveAfterDays: integer("abyss_archive_after_days"),
  /** Per-type switches for the W2d threshold alerts. Null = all defaults (on). */
  alertPrefs: jsonb("alert_prefs").$type<AlertPrefs>(),
  top3MiddayCheckin: text("top3_midday_checkin").notNull().default("on"),
  calendarAiEnabled: boolean("calendar_ai_enabled").notNull().default(true),
  /**
   * When the one-time Quarter guided first-run (the Direction→Target teach) was
   * dismissed. Null = never shown; set once, at zero-Directions. Not a recurring
   * gate (W5, discovery §13 Q6).
   */
  quarterFirstRunAt: timestamp("quarter_first_run_at", { withTimezone: true, mode: "date" }),
  /**
   * Declared time tilt for the quarter (W6, the Budget): the share of logged time
   * you mean to spend on business, 0–100, personal is the remainder. Null = never
   * declared, so the Today bar invites rather than measures. A single current value
   * (not per-quarter history) — the Ledger (W8) owns history if it ever needs it.
   */
  quarterTiltBusinessPct: integer("quarter_tilt_business_pct"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
