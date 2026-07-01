import type { ProjectCategory } from "@/lib/projects/categories";

export type QuarterGoalFields = {
  id: string;
  title: string;
  category: ProjectCategory;
  state: "active" | "done" | "backburnered";
  targetHorizon: "year" | "quarter" | "month" | null;
  targetYear: number | null;
  targetQuarter: number | null;
  targetMonth: number | null;
};

function isQuarterScoped(goal: QuarterGoalFields, year: number, quarter: number): boolean {
  return goal.targetYear === year && goal.targetQuarter === quarter;
}

/** Goals in the quarter tray — scoped to this quarter but not yet assigned a month (PM-3). */
export function filterUnassignedQuarterGoals(
  goals: QuarterGoalFields[],
  year: number,
  quarter: number
): QuarterGoalFields[] {
  return goals.filter(
    (goal) =>
      goal.state === "active" &&
      isQuarterScoped(goal, year, quarter) &&
      goal.targetMonth == null &&
      (goal.targetHorizon === "quarter" || goal.targetHorizon === null)
  );
}

/** Goals assigned to a specific month within the quarter. */
export function filterGoalsByMonth(
  goals: QuarterGoalFields[],
  year: number,
  quarter: number,
  month: number
): QuarterGoalFields[] {
  return goals.filter(
    (goal) =>
      goal.state === "active" &&
      isQuarterScoped(goal, year, quarter) &&
      goal.targetHorizon === "month" &&
      goal.targetMonth === month
  );
}

/** All goals visible on the quarter view (tray + month columns). */
export function filterQuarterGoals(
  goals: QuarterGoalFields[],
  year: number,
  quarter: number
): QuarterGoalFields[] {
  return goals.filter(
    (goal) =>
      goal.state === "active" &&
      isQuarterScoped(goal, year, quarter) &&
      (goal.targetHorizon === "quarter" ||
        goal.targetHorizon === "month" ||
        goal.targetHorizon === null)
  );
}

export function monthAssignmentPayload(year: number, quarter: number, month: number) {
  return {
    targetHorizon: "month" as const,
    targetYear: year,
    targetQuarter: quarter,
    targetMonth: month,
  };
}
