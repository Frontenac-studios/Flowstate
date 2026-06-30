/** CSS motion token names — keep in sync with src/styles/tokens.css (AN-0b). */
export const MOTION_TOKEN = {
  micro: "--motion-micro",
  short: "--motion-short",
  medium: "--motion-medium",
  long: "--motion-long",
} as const;

export type MotionTokenName = (typeof MOTION_TOKEN)[keyof typeof MOTION_TOKEN];

/** SSR / pre-paint fallbacks matching tokens.css defaults. */
export const MOTION_MICRO_MS = 90;
export const MOTION_SHORT_MS = 160;
export const MOTION_MEDIUM_MS = 240;
export const MOTION_LONG_MS = 420;

const FALLBACK_MS: Record<MotionTokenName, number> = {
  [MOTION_TOKEN.micro]: MOTION_MICRO_MS,
  [MOTION_TOKEN.short]: MOTION_SHORT_MS,
  [MOTION_TOKEN.medium]: MOTION_MEDIUM_MS,
  [MOTION_TOKEN.long]: MOTION_LONG_MS,
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Parse a motion duration token from the document root (ms). */
export function readMotionDurationMs(token: MotionTokenName): number {
  if (typeof window === "undefined") return FALLBACK_MS[token];
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw) return FALLBACK_MS[token];
  if (raw.endsWith("ms")) return Number.parseFloat(raw) || FALLBACK_MS[token];
  if (raw.endsWith("s")) return (Number.parseFloat(raw) || 0) * 1000;
  return FALLBACK_MS[token];
}

/** CSS transition shorthand for imperative DOM animations (pin flight). */
export function motionTransition(
  properties: string[],
  token: MotionTokenName = MOTION_TOKEN.medium
): string {
  const duration = `var(${token})`;
  const easing = "var(--ease-move)";
  return properties.map((p) => `${p} ${duration} ${easing}`).join(", ");
}
