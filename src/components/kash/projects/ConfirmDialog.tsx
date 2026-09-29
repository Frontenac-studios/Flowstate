"use client";

import { useEffect, useRef, type ReactNode } from "react";

import Button from "@/components/kash/ui/Button";
import Dialog from "@/components/kash/ui/Dialog";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** @deprecated Every Spec v3 dialog is opaque; kept so existing callers compile. */
  opaque?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirm / cancel on the Spec v3 dialog. Solid crimson only when `destructive`. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || destructive) return;
    // Destructive actions require an explicit click on the confirm button, so a
    // stray Enter right after the dialog opens can't fire the irreversible action.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !confirmDisabled) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, confirmDisabled, destructive, onConfirm]);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      size={children ? "md" : "sm"}
      // For destructive dialogs, focus Cancel so a reflexive Enter/Space doesn't confirm.
      initialFocusRef={destructive ? cancelRef : confirmRef}
      actions={
        <>
          <Button ref={cancelRef} type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={destructive ? "destructive" : "primary"}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
