"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { readLensState, writeLensState, type LensScope } from "@/lib/plan/lens-storage";
import {
  readTagFilter,
  toggleTagFilterValue,
  writeTagFilter,
  type TagFilterScope,
} from "@/lib/plan/tag-filter-storage";
import {
  EMPTY_LENS,
  LENS_PROPERTIES,
  NO_REVEAL,
  revealFlagsFromLens,
  setGroupLens,
  toggleFilterValue,
  toggleLens,
  type LensProperty,
  type LensState,
  type RevealFlags,
} from "@/lib/tasks/lens";

/** Keystroke → lens. c=Category, p=Project, r=pRiority (rank), d=Due (VF3). */
export const LENS_KEY_BINDINGS: Record<string, LensProperty> = {
  c: "category",
  p: "project",
  r: "priority",
  d: "due",
};

type LensContextValue = {
  scope: LensScope;
  /** Which properties this surface exposes (control-bar chips + bound keys). */
  properties: readonly LensProperty[];
  state: LensState;
  reveal: RevealFlags;
  tagFilter: string[];
  toggle: (prop: LensProperty) => void;
  setGroup: (prop: LensProperty | null) => void;
  toggleFilter: (prop: LensProperty, value: string) => void;
  toggleTagFilter: (tag: string) => void;
};

const LensContext = createContext<LensContextValue | null>(null);

/**
 * Owns lens state for one surface (VF-2). Hydrates from `localStorage` after
 * mount — the server (and first client paint) render clean, matching the
 * default-clean rule (VF5) and avoiding a hydration mismatch — then snaps to the
 * persisted choice. Binds the c/p/r/d toggle keys window-wide, guarded so they
 * never fire while typing.
 */
export function LensProvider({
  scope,
  children,
  properties = LENS_PROPERTIES,
  bindKeys = true,
}: {
  scope: LensScope;
  children: ReactNode;
  /** Limit the exposed lenses (e.g. Inbox = category + project only). */
  properties?: readonly LensProperty[];
  /**
   * Bind the c/p/r/d window keystrokes. Off for surfaces that share a route with
   * another LensProvider (e.g. the inbox strip beside the day canvas), so the
   * keys don't toggle two scopes at once — that surface is click-only.
   */
  bindKeys?: boolean;
}) {
  const [state, setState] = useState<LensState>(EMPTY_LENS);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  useEffect(() => {
    setState(readLensState(scope));
    if (scope === "this-week") setTagFilter(readTagFilter(scope));
  }, [scope]);

  // All mutations flow through one updater so every change persists.
  const update = useCallback(
    (next: (prev: LensState) => LensState) => {
      setState((prev) => {
        const value = next(prev);
        writeLensState(scope, value);
        return value;
      });
    },
    [scope]
  );

  const toggle = useCallback(
    (prop: LensProperty) => update((prev) => toggleLens(prev, prop)),
    [update]
  );
  const setGroup = useCallback(
    (prop: LensProperty | null) => update((prev) => setGroupLens(prev, prop)),
    [update]
  );
  const toggleFilter = useCallback(
    (prop: LensProperty, value: string) => update((prev) => toggleFilterValue(prev, prop, value)),
    [update]
  );
  const toggleTagFilter = useCallback(
    (tag: string) => {
      if (scope !== "this-week") return;
      setTagFilter((prev) => {
        const next = toggleTagFilterValue(prev, tag);
        writeTagFilter(scope as TagFilterScope, next);
        return next;
      });
    },
    [scope]
  );

  useEffect(() => {
    if (!bindKeys) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const prop = LENS_KEY_BINDINGS[e.key.toLowerCase()];
      if (!prop || !properties.includes(prop)) return;
      e.preventDefault();
      toggle(prop);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, bindKeys, properties]);

  const value = useMemo<LensContextValue>(
    () => ({
      scope,
      properties,
      state,
      reveal: revealFlagsFromLens(state),
      tagFilter,
      toggle,
      setGroup,
      toggleFilter,
      toggleTagFilter,
    }),
    [scope, properties, state, tagFilter, toggle, setGroup, toggleFilter, toggleTagFilter]
  );

  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

/** Lens controls for the surrounding surface. Null outside a `LensProvider`. */
export function useLens(): LensContextValue | null {
  return useContext(LensContext);
}

/** The reveal flags a `TaskRow` consumes — clean when outside any lens scope. */
export function useReveal(): RevealFlags {
  return useContext(LensContext)?.reveal ?? NO_REVEAL;
}
