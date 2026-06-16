"use client";

import { InPageSwitcher } from "../InPageSwitcher";
import { usePlanMode } from "./PlanProvider";

const PLAN_MODE_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
] as const;

/**
 * Day/Week segmented control for the Today surface, backed by the shared
 * InPageSwitcher. State (and its TTL/Monday persistence) stays in PlanProvider.
 */
export function PlanModeToggle() {
  const { mode, setMode } = usePlanMode();

  return (
    <InPageSwitcher
      options={PLAN_MODE_OPTIONS}
      value={mode}
      onChange={setMode}
      ariaLabel="Plan mode"
    />
  );
}
