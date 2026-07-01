export type CalendarColorMode = "category" | "project";
const STORAGE_KEY = "kash-projects:multi-calendar-color-mode";

export function readCalendarColorMode(): CalendarColorMode {
  if (typeof window === "undefined") return "category";
  return window.localStorage.getItem(STORAGE_KEY) === "project" ? "project" : "category";
}

export function writeCalendarColorMode(mode: CalendarColorMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}
