"use client";

import { useEffect, useRef } from "react";

import { trapTab } from "@/lib/dom/focus-trap";

/**
 * Shared modal chrome — matches `KeyboardShortcutsModal`'s pattern: lock body
 * scroll, close on Escape, focus the dialog on open, and trap Tab within it.
 * Returns a ref to spread onto the dialog element (`role="dialog"`, `tabIndex={-1}`).
 */
export function useDialogChrome({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") trapTab(e, dialogRef.current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  return dialogRef;
}
