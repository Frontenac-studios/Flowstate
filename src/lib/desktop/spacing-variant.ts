export type DesktopSpacingVariant = "a" | "b";

const STORAGE_KEY = "kash-spacing-variant";
const PREVIEW_ACTIVE_KEY = "kash-spacing-preview-active";

export function markSpacingPreviewActive(): void {
  window.localStorage.setItem(PREVIEW_ACTIVE_KEY, "1");
}

export function isSpacingPreviewActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREVIEW_ACTIVE_KEY) === "1";
}

export function readSpacingVariant(): DesktopSpacingVariant {
  if (typeof window === "undefined") return "a";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "b" ? "b" : "a";
}

export function writeSpacingVariant(variant: DesktopSpacingVariant): void {
  window.localStorage.setItem(STORAGE_KEY, variant);
  applySpacingVariant(variant);
}

export function applySpacingVariant(variant: DesktopSpacingVariant): void {
  const root = document.documentElement;
  if (variant === "b") {
    root.dataset.spacingVariant = "b";
  } else {
    delete root.dataset.spacingVariant;
  }
}

/** CSS custom properties to display in the spacing preview panel. */
export const SPACING_PREVIEW_VARS = [
  "--nav-rail-width",
  "--shell-gap",
  "--shell-pad-x",
  "--shell-pad-y",
  "--card-pad-x",
  "--card-pad-y",
  "--stack-gap",
  "--section-gap",
  "--chat-rail-width",
] as const;

export function readSpacingVarValues(): Record<string, string> {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    SPACING_PREVIEW_VARS.map((name) => [name, styles.getPropertyValue(name).trim()])
  );
}
