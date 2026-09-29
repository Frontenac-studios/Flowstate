"use client";

import { useEffect, useId, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { useDialogChrome } from "@/hooks/useDialogChrome";
import { cn } from "@/lib/cn";

import "./overlay.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** 14px muted body line under the title. */
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons, right-aligned. Solid crimson only on a final destructive action. */
  actions?: ReactNode;
  /** 360px (spec default) or 480px for dialogs that hold a form. */
  size?: "sm" | "md";
  /** Element to focus on open (e.g. Cancel on a destructive confirm). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Scrim click closes it (default true). */
  dismissOnScrim?: boolean;
};

/**
 * Spec v3 Sa dialog: centered, 360px, 14px radius, 24px padding, soft deep shadow over
 * a 32% ink scrim. 17px title, 14px muted body, buttons right-aligned. Escape closes;
 * Tab is trapped inside; body scroll is locked while open.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  size = "sm",
  initialFocusRef,
  dismissOnScrim = true,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useDialogChrome({ open, onClose });
  // Portal only after mount so SSR markup matches (document is client-only).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) initialFocusRef?.current?.focus();
  }, [open, initialFocusRef]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" role="presentation">
      <div
        className="kash-scrim absolute inset-0"
        aria-hidden
        onMouseDown={dismissOnScrim ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "kash-dialog-panel relative flex w-full flex-col gap-2 rounded-card bg-surface p-6 shadow-dialog outline-none",
          size === "sm" ? "max-w-[360px]" : "max-w-[480px]"
        )}
      >
        <h2 id={titleId} className="text-subtitle font-semibold text-ink">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="text-[14px] leading-normal text-ink-muted">
            {description}
          </p>
        ) : null}
        {children}
        {actions ? <div className="flex justify-end gap-2 pt-4">{actions}</div> : null}
      </div>
    </div>,
    document.body
  );
}
