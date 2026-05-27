import { PLAN_MODE_TTL_MS, type PlanMode } from "./plan-mode-constants";
import type { PlanModeStorageSnapshot } from "./plan-mode-storage";

export function resolveInitialPlanMode(now: Date, storage: PlanModeStorageSnapshot): PlanMode {
  if (!storage.lastActiveAt) return "day";

  const lastActive = Date.parse(storage.lastActiveAt);
  if (Number.isNaN(lastActive)) return "day";

  if (now.getTime() - lastActive < PLAN_MODE_TTL_MS) {
    return storage.lastPlanMode ?? "day";
  }

  return "day";
}
