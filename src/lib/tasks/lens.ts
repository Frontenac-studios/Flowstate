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
 * Selected filter values per property — VF-3 value-filters. A non-empty array
 * narrows a lens to those values (OR within the array); empty/absent = no
 * narrowing. Stored as strings (`taskLensValue` produces the matching keys).
 */
export type LensFilters = Partial<Record<LensProperty, string[]>>;

/**
 * Lens state: the active (revealed) property lenses, the single group/color
 * lens, and per-lens value-filters (VF-2 engine + VF-3 application).
 *
 * - `active` — revealed dimensions, ordered oldest → newest so the cap drops the
 *   oldest. ≤ `LENS_CAP`.
 * - `group` — the one property that groups/colors the list (VF3: grouping is
 *   singular). Always a member of `active`, or null.
 * - `filters` — selected values per lens; only meaningful for active lenses.
 */
export type LensState = {
  active: LensProperty[];
  group: LensProperty | null;
  filters: LensFilters;
};

export const EMPTY_LENS: LensState = { active: [], group: null, filters: {} };

function isLensProperty(key: string): key is LensProperty {
  return (LENS_PROPERTIES as readonly string[]).includes(key);
}

/** Trim to the most-recent `LENS_CAP` lenses (drop-oldest, VF3). */
function applyCap(active: LensProperty[]): LensProperty[] {
  return active.length > LENS_CAP ? active.slice(active.length - LENS_CAP) : active;
}

/** Drop group/filter state for any property no longer in `active`. */
function reconcile(state: LensState): LensState {
  const group = state.group && state.active.includes(state.group) ? state.group : null;
  const filters: LensFilters = {};
  for (const prop of state.active) {
    const values = state.filters[prop];
    if (values && values.length > 0) filters[prop] = values;
  }
  return { active: state.active, group, filters };
}

export function isLensActive(state: LensState, prop: LensProperty): boolean {
  return state.active.includes(prop);
}

/**
 * Toggle a property lens. Off → on appends it (dropping the oldest when this
 * would exceed the 2-lens cap, VF3); on → off removes it and clears its
 * group/filter state. Pure.
 */
export function toggleLens(state: LensState, prop: LensProperty): LensState {
  const active = state.active.includes(prop)
    ? state.active.filter((p) => p !== prop)
    : applyCap([...state.active, prop]);
  return reconcile({ ...state, active });
}

/**
 * Designate (or clear) the group/color lens (VF3 — exactly one). Passing a lens
 * that isn't active yet activates it first (respecting the cap); passing the
 * current group lens, or null, clears grouping. Pure.
 */
export function setGroupLens(state: LensState, prop: LensProperty | null): LensState {
  if (prop === null || prop === state.group) {
    return { ...state, group: null };
  }
  const active = state.active.includes(prop) ? state.active : applyCap([...state.active, prop]);
  // The cap may have dropped `prop` is impossible (it's last); but a prior group
  // could have been evicted — reconcile clears it if so.
  return reconcile({ ...state, active, group: prop });
}

/**
 * Toggle a single value in a lens's value-filter (VF-3). Activates the lens if
 * needed (respecting the cap). Removing the last value clears the filter. Pure.
 */
export function toggleFilterValue(state: LensState, prop: LensProperty, value: string): LensState {
  const active = state.active.includes(prop) ? state.active : applyCap([...state.active, prop]);
  const current = state.filters[prop] ?? [];
  const nextValues = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return reconcile({ ...state, active, filters: { ...state.filters, [prop]: nextValues } });
}

/** The reveal flags a `TaskRow` consumes for the currently-active lenses. */
export function revealFlagsFromLens(state: LensState): RevealFlags {
  const flags: RevealFlags = {};
  for (const prop of state.active) flags[prop] = true;
  return flags;
}

/** True when any active lens has a non-empty value-filter. */
export function hasActiveFilters(state: LensState): boolean {
  return state.active.some((prop) => (state.filters[prop]?.length ?? 0) > 0);
}

// --- Serialization -----------------------------------------------------------
// Compact form: `active|group|prop:v1,v2;prop:v3`. Order preserved; the parser
// re-applies the cap and reconciles, so tampered storage can't break invariants.

export function serializeLens(state: LensState): string {
  const active = state.active.join(",");
  const group = state.group ?? "";
  const filters = state.active
    .map((prop) => {
      const values = state.filters[prop];
      return values && values.length > 0 ? `${prop}:${values.join(",")}` : null;
    })
    .filter((s): s is string => s !== null)
    .join(";");
  return [active, group, filters].join("|");
}

export function parseLens(raw: string | null | undefined): LensState {
  if (!raw) return EMPTY_LENS;
  const [activeRaw = "", groupRaw = "", filtersRaw = ""] = raw.split("|");

  const active: LensProperty[] = [];
  for (const part of activeRaw.split(",")) {
    const key = part.trim().toLowerCase();
    if (isLensProperty(key) && !active.includes(key)) active.push(key);
  }

  const filters: LensFilters = {};
  for (const segment of filtersRaw.split(";")) {
    if (!segment) continue;
    const [propRaw, valuesRaw = ""] = segment.split(":");
    const prop = propRaw?.trim().toLowerCase();
    if (!prop || !isLensProperty(prop)) continue;
    const values = valuesRaw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (values.length > 0) filters[prop] = values;
  }

  const group = isLensProperty(groupRaw) ? groupRaw : null;
  return reconcile({ active: applyCap(active), group, filters });
}
