"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useDialogChrome } from "@/hooks/useDialogChrome";
import { cn } from "@/lib/cn";

import IconButton from "./IconButton";
import { kashIconProps } from "./icon";

import "./overlay.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Quiet line above the title — e.g. a project dot + "Great White › Reporting". */
  breadcrumb?: ReactNode;
  children: ReactNode;
  /** Footer row: secondary action on the left, primary on the right. */
  footer?: ReactNode;
  /** Panel width in px, 340–440 (default 420). */
  width?: number;
};

/**
 * Spec v3 Sa sheet: docked to the right edge, full height, no radius, a soft left
 * shadow over a 32% ink scrim. Header = breadcrumb, 20px title, close ×; the body
 * scrolls; the footer sits behind a 1px divider. Escape and the scrim close it.
 */
export default function Sheet({
  open,
  onClose,
  title,
  breadcrumb,
  children,
  footer,
  width = 420,
}: Props) {
  const titleId = useId();
  const panelRef = useDialogChrome({ open, onClose });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const clamped = Math.min(440, Math.max(340, width));

  return createPortal(
    <div className="fixed inset-0 z-modal" role="presentation">
      <div className="kash-scrim absolute inset-0" aria-hidden onMouseDown={onClose} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="kash-sheet-panel absolute inset-y-0 right-0 flex max-w-full flex-col bg-surface shadow-sheet outline-none"
        style={{ width: clamped }}
      >
        <header className="flex items-start gap-3 px-6 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {breadcrumb ? (
              <div className="flex items-center gap-1.5 text-meta text-ink-muted">{breadcrumb}</div>
            ) : null}
            <h2 id={titleId} className="text-title font-semibold text-ink">
              {title}
            </h2>
          </div>
          <IconButton aria-label="Close" onClick={onClose} className="size-8 shrink-0 px-0 py-0">
            <X {...kashIconProps({ tokenSize: "md" })} aria-hidden />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{children}</div>
        {footer ? (
          <footer
            className={cn(
              "flex items-center justify-between gap-2 border-t border-menu-divider px-6 py-4"
            )}
          >
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body
  );
}
