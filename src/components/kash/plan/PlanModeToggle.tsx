"use client";

import { InPageSwitcher } from "../InPageSwitcher";
import { usePlanMode } from "./PlanProvider";

const PLAN_MODE_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
] as const;

const WEEK_PLANNING_OPTIONS = [
  { value: "off", label: "Execute" },
  { value: "on", label: "Plan mode" },
] as const;

type DayWeekProps = {
  variant?: "dayWeek";
};

type WeekPlanningProps = {
  variant: "weekPlanning";
  value: boolean;
  onChange: (open: boolean) => void;
};

/**
 * Day/Week segmented control for the Today surface, backed by the shared
 * InPageSwitcher. State (and its TTL/Monday persistence) stays in PlanProvider.
 *
 * `variant="weekPlanning"` toggles the planning rail on `/plan` Week tab.
 */
export function PlanModeToggle(props: DayWeekProps | WeekPlanningProps) {
  const planMode = usePlanMode();

  if (props.variant === "weekPlanning") {
    return (
      <InPageSwitcher
        options={WEEK_PLANNING_OPTIONS}
        value={props.value ? "on" : "off"}
        onChange={(next) => props.onChange(next === "on")}
        ariaLabel="Week planning mode"
      />
    );
  }

  const { mode, setMode } = planMode;

  return (
    <InPageSwitcher
      options={PLAN_MODE_OPTIONS}
      value={mode}
      onChange={setMode}
      ariaLabel="Plan mode"
    />
  );
}
