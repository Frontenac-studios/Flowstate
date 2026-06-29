/** Remembers the Abyss's dark/light choice (the page is dark by default — the dark
 * aesthetic exception). localStorage now; can move to app-settings later. */

export type AbyssTheme = "dark" | "light";

const ABYSS_THEME_KEY = "kash.abyss.theme";

export function readAbyssTheme(): AbyssTheme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(ABYSS_THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function writeAbyssTheme(theme: AbyssTheme): void {
  if (typeof window === "undefined") return;
  try {
    if (theme === "dark") window.localStorage.removeItem(ABYSS_THEME_KEY);
    else window.localStorage.setItem(ABYSS_THEME_KEY, "light");
  } catch {
    /* ignore quota / private mode */
  }
}
