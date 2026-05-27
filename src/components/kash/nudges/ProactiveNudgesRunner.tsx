"use client";

import { useProactiveNudges } from "@/hooks/useProactiveNudges";

/** Mount inside ChatProvider on plan and focus layouts. */
export function ProactiveNudgesRunner() {
  useProactiveNudges();
  return null;
}
