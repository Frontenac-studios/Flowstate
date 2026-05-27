export const EOD_HOUR_DEFAULT = 18;

export const EOD_STORAGE_KEYS = {
  snoozeUntil: "kash.eod.snoozeUntil",
  skippedDate: "kash.eod.skippedDate",
} as const;

export const EOD_SESSION_KEYS = {
  modalShownForDate: "kash.eod.modalShownForDate",
  generateAttemptedForDate: "kash.eod.generateAttemptedForDate",
} as const;

export function eodThresholdHour(): number {
  if (typeof process !== "undefined") {
    const raw = process.env.NEXT_PUBLIC_EOD_DEBUG_HOUR ?? process.env.EOD_DEBUG_HOUR;
    if (raw !== undefined) {
      const h = Number.parseInt(raw, 10);
      if (Number.isFinite(h) && h >= 0 && h <= 23) return h;
    }
  }
  return EOD_HOUR_DEFAULT;
}
