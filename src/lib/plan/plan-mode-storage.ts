import { PLAN_MODE_STORAGE_KEYS, type PlanMode } from "./plan-mode-constants";

export type PlanModeStorageSnapshot = {
  lastPlanMode: PlanMode | null;
  lastActiveAt: string | null;
  mondayChoiceDate: string | null;
};

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPlanModeStorage(): PlanModeStorageSnapshot {
  const mode = readLocal(PLAN_MODE_STORAGE_KEYS.lastPlanMode);
  return {
    lastPlanMode: mode === "week" || mode === "day" ? mode : null,
    lastActiveAt: readLocal(PLAN_MODE_STORAGE_KEYS.lastActiveAt),
    mondayChoiceDate: readLocal(PLAN_MODE_STORAGE_KEYS.mondayChoiceDate),
  };
}

export function writeLastPlanMode(mode: PlanMode): void {
  writeLocal(PLAN_MODE_STORAGE_KEYS.lastPlanMode, mode);
}

export function writeLastActiveAt(iso: string): void {
  writeLocal(PLAN_MODE_STORAGE_KEYS.lastActiveAt, iso);
}

export function writeMondayChoiceDate(localDate: string): void {
  writeLocal(PLAN_MODE_STORAGE_KEYS.mondayChoiceDate, localDate);
}
