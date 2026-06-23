export type LensProperty = "category" | "priority" | "project" | "due";

/** Which property indicators a row reveals. Derived from `LensState` (VF-2). */
export type RevealFlags = Partial<Record<LensProperty, boolean>>;

export const NO_REVEAL: RevealFlags = {};

/** Canonical property order — drives the control bar and serialization. */
export const LENS_PROPERTIES: readonly LensProperty[] = ["category", "priority", "project", "due"];

/**
 * Hard cap on simultaneously-active lenses (VF3). Toggling a 3rd lens drops the
 * oldest so at most two dimensions are ever revealed at once.
 */
export const LENS_CAP = 2;

/**
 * VF-2 lens state: the active (revealed) property lenses, ordered oldest →
 * newest so the cap can drop the oldest. Value-filters and the group/color
 * designation are VF-3 — they slot in here additively without breaking callers.
 */
export type LensState = {
  active: LensProperty[];
};

export const EMPTY_LENS: LensState = { active: [] };

function isLensProperty(key: string): key is LensProperty {
  return (LENS_PROPERTIES as readonly string[]).includes(key);
}

/** Trim to the most-recent `LENS_CAP` lenses (drop-oldest, VF3). */
function applyCap(active: LensProperty[]): LensProperty[] {
  return active.length > LENS_CAP ? active.slice(active.length - LENS_CAP) : active;
}

export function isLensActive(state: LensState, prop: LensProperty): boolean {
  return state.active.includes(prop);
}

/**
 * Toggle a property lens. Off → on appends it (dropping the oldest when this
 * would exceed the 2-lens cap, VF3); on → off removes it. Pure.
 */
export function toggleLens(state: LensState, prop: LensProperty): LensState {
  if (state.active.includes(prop)) {
    return { active: state.active.filter((p) => p !== prop) };
  }
  return { active: applyCap([...state.active, prop]) };
}

/** The reveal flags a `TaskRow` consumes for the currently-active lenses. */
export function revealFlagsFromLens(state: LensState): RevealFlags {
  const flags: RevealFlags = {};
  for (const prop of state.active) flags[prop] = true;
  return flags;
}

/** Serialize for storage — comma-separated, order preserved. */
export function serializeLens(state: LensState): string {
  return state.active.join(",");
}

/**
 * Parse a stored lens string back to state. Ignores unknown/duplicate tokens
 * and re-applies the cap, so tampered or stale storage can't exceed it.
 */
export function parseLens(raw: string | null | undefined): LensState {
  if (!raw) return EMPTY_LENS;
  const active: LensProperty[] = [];
  for (const part of raw.split(",")) {
    const key = part.trim().toLowerCase();
    if (isLensProperty(key) && !active.includes(key)) active.push(key);
  }
  return { active: applyCap(active) };
}
