export const PLAN_MODE_TTL_MS = 2 * 60 * 60 * 1000;

export const PLAN_MODE_STORAGE_KEYS = {
  lastPlanMode: "kash.plan.lastPlanMode",
  lastActiveAt: "kash.plan.lastActiveAt",
  mondayChoiceDate: "kash.plan.mondayChoiceDate",
} as const;

export type PlanMode = "day" | "week";
