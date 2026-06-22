export type LensProperty = "category" | "priority" | "project" | "due";

/** Which property indicators a row reveals. VF-2 drives this from real lens state. */
export type RevealFlags = Partial<Record<LensProperty, boolean>>;

export const NO_REVEAL: RevealFlags = {};

function isLensProperty(key: string): key is LensProperty {
  return key === "category" || key === "priority" || key === "project" || key === "due";
}

/**
 * VF-1 dev-only verification toggle: `?vfReveal=category,priority,project,due`
 * flips reveal flags so the clean → revealed transitions can be exercised in the
 * browser before VF-2 wires real lens state. Removed once VF-2 lands. SSR-safe
 * (returns no reveal on the server; the caller reads it in an effect to avoid a
 * hydration mismatch).
 */
export function readVfRevealFromQuery(): RevealFlags {
  if (typeof window === "undefined") return NO_REVEAL;
  const raw = new URLSearchParams(window.location.search).get("vfReveal");
  if (!raw) return NO_REVEAL;
  const flags: RevealFlags = {};
  for (const part of raw.split(",")) {
    const key = part.trim().toLowerCase();
    if (isLensProperty(key)) flags[key] = true;
  }
  return flags;
}
