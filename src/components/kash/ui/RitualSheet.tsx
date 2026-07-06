"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { trapTab } from "@/lib/dom/focus-trap";

import "@/styles/ritual-sheet.css";

type Props = {
  open: boolean;
  title: string;
  titleId?: string;
  describedBy?: string;
  children: ReactNode;
  footer?: ReactNode;
  onDismiss?: () => void;
  /** When false, backdrop click does not dismiss (morning hand-off keeps Skip explicit). */
  dismissOnBackdrop?: boolean;
};

/**
 * D36/D37 — right-side full-height ritual sheet. Today stays visible behind a
 * `--backdrop` scrim; the panel scrolls internally with D13 fade cues.
 */
export function RitualSheet({
  open,
  title,
  titleId: titleIdProp,
  describedBy,
  children,
  footer,
  onDismiss,
  dismissOnBackdrop = true,
}: Props) {
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? generatedTitleId;
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const updateFade = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setFadeTop(scrollTop > 4);
    setFadeBottom(scrollTop + clientHeight < scrollHeight - 4);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Escape dismisses whenever the sheet offers a dismiss path. This is separate
    // from `dismissOnBackdrop` (which governs stray clicks): the morning hand-off
    // blocks backdrop clicks but still honors Escape/Skip. Forced flows like
    // onboarding pass no `onDismiss` and stay put.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onDismiss) {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === "Tab") trapTab(e, panelRef.current);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onDismiss]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    requestAnimationFrame(updateFade);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    const observer = new ResizeObserver(updateFade);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  if (!open) return null;

  return (
    <div className="ritual-sheet-overlay fixed inset-0 z-modal" role="presentation">
      {dismissOnBackdrop ? (
        <button
          type="button"
          className="ritual-sheet-backdrop absolute inset-0"
          aria-label="Dismiss"
          onClick={onDismiss}
        />
      ) : (
        <div className="ritual-sheet-backdrop absolute inset-0" aria-hidden />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className="ritual-sheet-panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-overlay"
      >
        <header className="shrink-0 border-b border-subtle px-[var(--space-5)] py-[var(--space-4)]">
          <h2 id={titleId} className="text-title font-semibold text-ink">
            {title}
          </h2>
        </header>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            className="ritual-sheet-scroll h-full overflow-y-auto px-[var(--space-5)] py-[var(--space-4)]"
            onScroll={updateFade}
          >
            {children}
          </div>
          <div
            className={cn(
              "ritual-sheet-fade ritual-sheet-fade-top pointer-events-none absolute inset-x-0 top-0 h-6",
              fadeTop && "ritual-sheet-fade-visible"
            )}
            aria-hidden
          />
          <div
            className={cn(
              "ritual-sheet-fade ritual-sheet-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 h-6",
              fadeBottom && "ritual-sheet-fade-visible"
            )}
            aria-hidden
          />
        </div>

        {footer ? (
          <footer className="shrink-0 border-t border-subtle px-[var(--space-5)] py-[var(--space-4)]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
