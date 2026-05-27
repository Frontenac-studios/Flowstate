"use client";

import { usePlanMode } from "./PlanProvider";
import { DayPlanCanvas } from "./DayPlanCanvas";
import { WeekCanvas } from "./week/WeekCanvas";

export function PlanCanvas() {
  const { mode, mondayBlocked } = usePlanMode();

  if (mondayBlocked) {
    return <div className="min-h-[50vh]" aria-hidden />;
  }

  return mode === "week" ? <WeekCanvas /> : <DayPlanCanvas />;
}
