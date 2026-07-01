import { filterGoalsByMonth, type QuarterGoalFields } from "@/lib/planning/quarter-goals";

import { quarterForMonth } from "./month-calendar";

export type { QuarterGoalFields as MonthGoalFields };

/** Active goals assigned to a specific calendar month. */
export function filterMonthGoals(
  goals: QuarterGoalFields[],
  year: number,
  month: number
): QuarterGoalFields[] {
  return filterGoalsByMonth(goals, year, quarterForMonth(month), month);
}
