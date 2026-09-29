"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a menu or popover on a pointer-down outside every ref'd element (the panel
 * and its trigger) or on Escape. The shared version of what each hand-rolled menu
 * used to wire up itself.
 */
export function useDismiss(
  open: boolean,
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  onDismiss: () => void
): void {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && refs.some((r) => r.current?.contains(target))) return;
      onDismiss();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // refs are stable RefObjects; listing the array would re-bind every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onDismiss]);
}
