import { CARE_CADENCES, CARE_THEMES, type CareCadence, type CareTheme } from "./types";

// Display labels for the Care library UI (CL4). Pure + framework-free so they
// stay unit-testable and reusable. The catalog groups practices "by need" (D3/D4);
// THEME_ORDER is the canonical section order (matches CARE_THEMES / seed-catalog).

export const THEME_ORDER: readonly CareTheme[] = CARE_THEMES;

export const THEME_LABELS: Record<CareTheme, string> = {
  move: "Move",
  calm: "Calm",
  connect: "Connect",
  rest: "Rest",
  nourish: "Nourish",
  reflect: "Reflect",
};

/** Human label for a cadence; `null`/unset reads as a one-off ("no set rhythm"). */
export const CADENCE_LABELS: Record<CareCadence, string> = {
  daily: "Daily",
  most_days: "Most days",
  weekly: "Weekly",
  when_needed: "When needed",
};

export function cadenceLabel(cadence: CareCadence | null | undefined): string | null {
  return cadence ? CADENCE_LABELS[cadence] : null;
}

/** Cadence options for the create/edit picker — leading "no rhythm" then the four cadences. */
export const CADENCE_OPTIONS: ReadonlyArray<{ value: CareCadence | ""; label: string }> = [
  { value: "", label: "No set rhythm" },
  ...CARE_CADENCES.map((value) => ({ value, label: CADENCE_LABELS[value] })),
];

/**
 * Group theme-bearing items into the canonical THEME_ORDER, dropping empty themes.
 * Used by both library zones (your practices · suggested) to render section blocks.
 */
export function groupByTheme<T extends { theme: CareTheme }>(
  items: readonly T[]
): Array<{ theme: CareTheme; label: string; items: T[] }> {
  return THEME_ORDER.map((theme) => ({
    theme,
    label: THEME_LABELS[theme],
    items: items.filter((item) => item.theme === theme),
  })).filter((group) => group.items.length > 0);
}
