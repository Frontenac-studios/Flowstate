import { pgEnum } from "drizzle-orm/pg-core";

export const goalState = pgEnum("goal_state", ["active", "done", "backburnered"]);

export const obligationDesire = pgEnum("obligation_desire", ["obligation", "desire"]);

export const targetHorizon = pgEnum("target_horizon", ["year", "quarter", "month"]);

export const reservedDayType = pgEnum("reserved_day_type", ["outside", "personal"]);
