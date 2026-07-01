export const CHECK_IN_STORAGE_KEYS = {
  cadence: "kash.plan.checkIn.cadence",
  snoozeUntil: "kash.plan.checkIn.snoozeUntil",
  lastCompletedAt: "kash.plan.checkIn.lastCompletedAt",
} as const;

export type CheckInCadence = "weekly" | "biweekly" | "monthly" | "off";

export type CheckInStorageSnapshot = {
  cadence: CheckInCadence;
  snoozeUntil: string | null;
  lastCompletedAt: string | null;
};

const CADENCE_MS: Record<Exclude<CheckInCadence, "off">, number> = {
  weekly: 7 * 86_400_000,
  biweekly: 14 * 86_400_000,
  monthly: 30 * 86_400_000,
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

function parseCadence(raw: string | null): CheckInCadence {
  if (raw === "weekly" || raw === "biweekly" || raw === "monthly" || raw === "off") return raw;
  return "weekly";
}

export function readCheckInStorage(): CheckInStorageSnapshot {
  return {
    cadence: parseCadence(readLocal(CHECK_IN_STORAGE_KEYS.cadence)),
    snoozeUntil: readLocal(CHECK_IN_STORAGE_KEYS.snoozeUntil),
    lastCompletedAt: readLocal(CHECK_IN_STORAGE_KEYS.lastCompletedAt),
  };
}

export function setCheckInCadence(cadence: CheckInCadence): void {
  writeLocal(CHECK_IN_STORAGE_KEYS.cadence, cadence);
}

export function setCheckInSnoozeUntil(iso: string): void {
  writeLocal(CHECK_IN_STORAGE_KEYS.snoozeUntil, iso);
}

export function clearCheckInSnooze(): void {
  writeLocal(CHECK_IN_STORAGE_KEYS.snoozeUntil, null);
}

export function markCheckInCompleted(now: Date = new Date()): void {
  writeLocal(CHECK_IN_STORAGE_KEYS.lastCompletedAt, now.toISOString());
}

export function isCheckInSnoozed(now: Date, snoozeUntilIso: string | null): boolean {
  if (!snoozeUntilIso) return false;
  const until = Date.parse(snoozeUntilIso);
  if (Number.isNaN(until)) return false;
  return now.getTime() < until;
}

/** True when cadence is enabled and the next gentle nudge is due (PM7-1). */
export function isCheckInCadenceDue(
  now: Date,
  storage: Pick<CheckInStorageSnapshot, "cadence" | "snoozeUntil" | "lastCompletedAt">
): boolean {
  if (storage.cadence === "off") return false;
  if (isCheckInSnoozed(now, storage.snoozeUntil)) return false;

  const interval = CADENCE_MS[storage.cadence];
  if (!storage.lastCompletedAt) return true;

  const last = Date.parse(storage.lastCompletedAt);
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= interval;
}
