import { addDays, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { monthsForQuarter } from "@/lib/planning/quarter-months";

import {
  checkInScopeKey,
  type CheckInDepth,
  type CheckInPayload,
  type CheckInScope,
} from "./check-in";

type GoalRow = {
  id: string;
  title: string;
  targetHorizon: string | null;
  targetYear: number | null;
  targetQuarter: number | null;
  targetMonth: number | null;
  state: string;
};

type TaskRow = {
  id: string;
  title: string;
  scheduledDate: string | null;
};

type MilestoneRow = {
  goalId: string;
};

/** Mock check-in proposals until §11 AI persona ships. */
export function templateCheckInSuggestions(
  scope: CheckInScope,
  goals: readonly GoalRow[],
  tasks: readonly TaskRow[],
  milestones: readonly MilestoneRow[]
): CheckInPayload[] {
  const scopeKey = checkInScopeKey(scope);
  const activeGoals = goals.filter((g) => g.state === "active" && g.targetYear === scope.year);
  const milestoneGoalIds = new Set(milestones.map((m) => m.goalId));
  const suggestions: CheckInPayload[] = [];

  const unassignedHorizon = activeGoals.filter(
    (g) => g.targetHorizon == null || (g.targetHorizon === "year" && scope.depth !== "year")
  );
  for (const goal of unassignedHorizon.slice(0, 2)) {
    const target = horizonTargetForDepth(scope.depth, scope);
    if (!target) continue;
    suggestions.push({
      scopeKey,
      depth: scope.depth,
      year: scope.year,
      month: scope.month ?? null,
      quarter: scope.quarter ?? null,
      weekStart: scope.weekStart ?? null,
      action: "goal_horizon",
      label: `Assign "${goal.title}" to ${target.label}`,
      goalId: goal.id,
      goalTitle: goal.title,
      targetHorizon: target.horizon,
      targetMonth: target.month,
      targetQuarter: target.quarter,
    });
  }

  const withoutMilestones = activeGoals.filter((g) => !milestoneGoalIds.has(g.id));
  for (const goal of withoutMilestones.slice(0, 1)) {
    suggestions.push({
      scopeKey,
      depth: scope.depth,
      year: scope.year,
      month: scope.month ?? null,
      quarter: scope.quarter ?? null,
      weekStart: scope.weekStart ?? null,
      action: "milestone",
      label: `Add first milestone for "${goal.title}"`,
      goalId: goal.id,
      goalTitle: goal.title,
      milestoneTitle: `First step toward ${goal.title}`,
      sortOrder: 0,
    });
  }

  if (scope.depth === "week" && scope.weekStart) {
    const weekStart = parseISODateString(scope.weekStart);
    const unscheduled = tasks.filter((t) => !t.scheduledDate);
    for (let index = 0; index < Math.min(unscheduled.length, 2); index += 1) {
      const task = unscheduled[index]!;
      const day = addDays(weekStart, index + 1);
      suggestions.push({
        scopeKey,
        depth: scope.depth,
        year: scope.year,
        month: scope.month ?? null,
        quarter: scope.quarter ?? null,
        weekStart: scope.weekStart,
        action: "task_schedule",
        label: `Schedule "${task.title}" for ${formatShortDate(day)}`,
        taskId: task.id,
        taskTitle: task.title,
        scheduledDate: toISODateString(day),
      });
    }
  }

  return suggestions;
}

function horizonTargetForDepth(
  depth: CheckInDepth,
  scope: CheckInScope
): { horizon: "quarter" | "month"; month?: number; quarter?: number; label: string } | null {
  if (depth === "quarter" && scope.quarter != null) {
    return { horizon: "quarter", quarter: scope.quarter, label: `Q${scope.quarter}` };
  }
  if (depth === "month" && scope.month != null) {
    const quarter = scope.quarter ?? Math.ceil(scope.month / 3);
    return { horizon: "month", month: scope.month, quarter, label: monthName(scope.month) };
  }
  if (depth === "week" && scope.month != null) {
    const quarter = scope.quarter ?? Math.ceil(scope.month / 3);
    return { horizon: "month", month: scope.month, quarter, label: "this week" };
  }
  if (depth === "year") {
    const quarter = 1;
    const month = monthsForQuarter(quarter)[0];
    return { horizon: "quarter", quarter, month, label: "Q1" };
  }
  return null;
}

function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

function formatShortDate(date: Date): string {
  return date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
