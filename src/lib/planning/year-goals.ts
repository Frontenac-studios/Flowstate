import type { ProjectCategory } from "@/lib/projects/categories";

export type GoalHorizonFields = {
  id: string;
  title: string;
  category: ProjectCategory;
  state: "active" | "done" | "backburnered";
  targetYear: number | null;
  targetQuarter: number | null;
};

/** Goals waiting in the year tray — active and not yet assigned to a quarter (ET-3). */
export function filterUnplacedGoals(goals: GoalHorizonFields[], year: number): GoalHorizonFields[] {
  return goals.filter(
    (goal) =>
      goal.state === "active" &&
      (goal.targetQuarter == null || goal.targetYear == null || goal.targetYear !== year)
  );
}

export function quarterAssignmentPayload(year: number, quarter: number) {
  return {
    targetHorizon: "quarter" as const,
    targetYear: year,
    targetQuarter: quarter,
    targetMonth: null,
  };
}
