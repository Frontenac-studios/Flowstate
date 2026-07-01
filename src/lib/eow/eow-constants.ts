export const EOW_WIND_DOWN_DEFAULT_DAY = 0;
export const EOW_WIND_DOWN_DEFAULT_HOUR = 18;

export const EOW_STORAGE_KEYS = {
  snoozeUntil: "kash.eow.snoozeUntil",
  dismissedWeekStart: "kash.eow.dismissedWeekStart",
  skippedWeekStart: "kash.eow.skippedWeekStart",
} as const;

export const EOW_SESSION_KEYS = {
  generateAttemptedForWeek: "kash.eow.generateAttemptedForWeek",
} as const;
