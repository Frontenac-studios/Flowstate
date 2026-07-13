"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  /** "strong" deepens the scrim so the rail recedes further (morning hand-off). */
  dim?: "default" | "strong";
  /**
   * Panel size. Default `wide` (~max-w-5xl, 85vh); `md` is narrower;
   * `xl` is used by morning hand-off (~max-w-7xl, 92vh).
   */
  size?: "md" | "wide" | "xl";
  /**
   * `scroll` (default) — single body scroller.
   * `fill` — children own height/scroll (morning two-column layout).
   */
  bodyLayout?: "scroll" | "fill";
};

/**
 * Centered ritual modal — full-screen dim + blur; the panel scrolls internally with
 * D13 fade cues. Used for morning hand-off, EOD, Monday entry, and onboarding.
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
  dim = "default",
  size = "wide",
  bodyLayout = "scroll",
}: Props) {
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? generatedTitleId;
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);
  // Portal only after mount so SSR markup matches (document is client-only).
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

    // Escape honors onDismiss even when backdrop clicks are blocked (morning hand-off).
    // Forced flows like onboarding omit onDismiss and stay put.
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

  if (!open || !mounted) return null;

  const backdropClass = cn(
    "ritual-sheet-backdrop absolute inset-0 z-0",
    dim === "strong" && "ritual-sheet-backdrop--strong"
  );

  // Inert scrim stays under the panel (z-0). Panel transform creates a stacking
  // context — without z-index the absolute backdrop can swallow footer clicks.
  const backdrop = dismissOnBackdrop ? (
    <button type="button" className={backdropClass} aria-label="Dismiss" onClick={onDismiss} />
  ) : (
    <div className={backdropClass} aria-hidden />
  );

  const body =
    bodyLayout === "fill" ? (
      <div className="flex h-full min-h-0 flex-col px-[var(--space-5)] py-[var(--space-4)]">
        {children}
      </div>
    ) : (
      <>
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
      </>
    );

  return createPortal(
    <div
      className="ritual-sheet-overlay fixed inset-0 z-modal flex items-center justify-center p-4 backdrop-blur-sm"
      role="presentation"
    >
      {backdrop}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn(
          "ritual-sheet-panel relative z-10 flex w-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-overlay focus:outline-none",
          size === "xl"
            ? "max-h-[92vh] max-w-7xl"
            : size === "wide"
              ? "max-h-[85vh] max-w-5xl"
              : "max-h-[85vh] max-w-xl"
        )}
      >
        <header className="shrink-0 border-b border-subtle px-[var(--space-5)] py-[var(--space-4)]">
          <h2 id={titleId} className="text-title font-semibold text-ink">
            {title}
          </h2>
        </header>

        <div className="relative min-h-0 flex-1">{body}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-subtle px-[var(--space-5)] py-[var(--space-4)]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
