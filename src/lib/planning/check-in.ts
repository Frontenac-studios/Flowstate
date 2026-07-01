import { z } from "zod";

export const checkInDepthSchema = z.enum(["week", "month", "quarter", "year"]);
export type CheckInDepth = z.infer<typeof checkInDepthSchema>;

export type CheckInScope = {
  depth: CheckInDepth;
  year: number;
  month?: number;
  quarter?: number;
  weekStart?: string;
};

/** Stable key for filtering persisted check-in suggestions by scope (PM7-4). */
export function checkInScopeKey(scope: CheckInScope): string {
  if (scope.depth === "week" && scope.weekStart) {
    return `week:${scope.weekStart}`;
  }
  if (scope.depth === "month" && scope.month != null) {
    return `month:${scope.year}-${scope.month}`;
  }
  if (scope.depth === "quarter" && scope.quarter != null) {
    return `quarter:${scope.year}-Q${scope.quarter}`;
  }
  return `year:${scope.year}`;
}

export const checkInActionSchema = z.enum(["goal_horizon", "milestone", "task_schedule"]);
export type CheckInAction = z.infer<typeof checkInActionSchema>;

export const checkInTargetHorizonSchema = z.enum(["quarter", "month"]);
export type CheckInTargetHorizon = z.infer<typeof checkInTargetHorizonSchema>;

export const checkInPayloadSchema = z.object({
  scopeKey: z.string(),
  depth: checkInDepthSchema,
  year: z.number().int(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  quarter: z.number().int().min(1).max(4).nullable().optional(),
  weekStart: z.string().nullable().optional(),
  action: checkInActionSchema,
  label: z.string(),
  goalId: z.string().uuid().optional(),
  goalTitle: z.string().optional(),
  milestoneTitle: z.string().optional(),
  taskId: z.string().uuid().optional(),
  taskTitle: z.string().optional(),
  targetHorizon: checkInTargetHorizonSchema.optional(),
  targetMonth: z.number().int().min(1).max(12).optional(),
  targetQuarter: z.number().int().min(1).max(4).optional(),
  scheduledDate: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export type CheckInPayload = z.infer<typeof checkInPayloadSchema>;

export const CHECK_IN_DEPTH_OPTIONS: { value: CheckInDepth; label: string; hint: string }[] = [
  { value: "week", label: "This week", hint: "A few tasks and schedule tweaks" },
  { value: "month", label: "This month", hint: "Goals and reserved days" },
  { value: "quarter", label: "This quarter", hint: "Spread and theme alignment" },
  { value: "year", label: "Big picture", hint: "Horizons and annual goals" },
];

export function checkInDepthLabel(depth: CheckInDepth): string {
  return CHECK_IN_DEPTH_OPTIONS.find((o) => o.value === depth)?.label ?? depth;
}
