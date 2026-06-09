"use client";

import { useTop3Rollover } from "@/hooks/useTop3Rollover";

/** Mount inside PlanProvider on plan and focus layouts. */
export function Top3RolloverRunner() {
  useTop3Rollover();
  return null;
}
