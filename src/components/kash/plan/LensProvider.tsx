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
  EMPTY_LENS,
  NO_REVEAL,
  revealFlagsFromLens,
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
  state: LensState;
  reveal: RevealFlags;
  toggle: (prop: LensProperty) => void;
};

const LensContext = createContext<LensContextValue | null>(null);

/**
 * Owns lens state for one surface (VF-2). Hydrates from `localStorage` after
 * mount — the server (and first client paint) render clean, matching the
 * default-clean rule (VF5) and avoiding a hydration mismatch — then snaps to the
 * persisted choice. Binds the c/p/r/d toggle keys window-wide, guarded so they
 * never fire while typing.
 */
export function LensProvider({ scope, children }: { scope: LensScope; children: ReactNode }) {
  const [state, setState] = useState<LensState>(EMPTY_LENS);

  useEffect(() => {
    setState(readLensState(scope));
  }, [scope]);

  const toggle = useCallback(
    (prop: LensProperty) => {
      setState((prev) => {
        const next = toggleLens(prev, prop);
        writeLensState(scope, next);
        return next;
      });
    },
    [scope]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const prop = LENS_KEY_BINDINGS[e.key.toLowerCase()];
      if (!prop) return;
      e.preventDefault();
      toggle(prop);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const value = useMemo<LensContextValue>(
    () => ({ state, reveal: revealFlagsFromLens(state), toggle }),
    [state, toggle]
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
