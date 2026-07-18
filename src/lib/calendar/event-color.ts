/** Google calendarList colors → Kash timeline block styles (A1 soft fill). */

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const FALLBACK_STRIPE = "var(--ink-faint)";
const FALLBACK_FILL = "var(--surface-2)";
const FALLBACK_TEXT = "var(--ink)";

/** Normalize provider hex; returns null when missing or invalid. */
export function normalizeCalendarHex(color: string | null | undefined): string | null {
  if (!color) return null;
  const trimmed = color.trim();
  if (!HEX_RE.test(trimmed)) return null;
  if (trimmed.length === 4) {
    const r = trimmed[1]!;
    const g = trimmed[2]!;
    const b = trimmed[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export type CalendarEventColors = {
  stripe: string;
  fill: string;
  text: string;
};

/**
 * Soft fill (~12% solid into surface) + solid stripe + a darkened text tint;
 * neutral fallback when no color. `text` mixes the calendar hue toward ink so
 * the title/time read the calendar's own colour while staying legible on the
 * pale fill.
 */
export function calendarEventColors(color: string | null | undefined): CalendarEventColors {
  const hex = normalizeCalendarHex(color);
  if (!hex) {
    return { stripe: FALLBACK_STRIPE, fill: FALLBACK_FILL, text: FALLBACK_TEXT };
  }
  return {
    stripe: hex,
    fill: `color-mix(in srgb, ${hex} 12%, var(--surface))`,
    text: `color-mix(in srgb, ${hex} 60%, var(--ink))`,
  };
}
