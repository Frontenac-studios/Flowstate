"use client";

import { useProactiveNudges } from "@/hooks/useProactiveNudges";

/** Mount inside ChatProvider on /today, /plan, and /today/focus. */
export function ProactiveNudgesRunner() {
  useProactiveNudges();
  return null;
}
