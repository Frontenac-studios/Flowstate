"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type AddTaskPopoverHandle = {
  /** Return focus to the trigger — used when a revealed composer collapses. */
  focusTrigger: () => void;
};

type Props = {
  /** Featured path: chat is the primary way to create tasks (opens the chat rail). */
  onAskChat: () => void;
  /** Quiet fallback: reveal + focus the manual composer. */
  onTypeManually: () => void;
  /** Noun used in labels; defaults to "task". */
  noun?: string;
  className?: string;
  /** Embed inside an active-surface track (Today header cluster). */
  embedded?: boolean;
  /** Popover menu alignment; default left. */
  menuAlign?: "left" | "right";
};

const MENU_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

/**
 * Compact "+" that de-emphasizes the manual composers (Phase 5): chat is the
 * primary way to create tasks, with typing kept as a quiet fallback. Opens a
 * two-choice popover — "Ask chat" (featured) or "Type <noun>s" (reveals the
 * collapsed composer). Keyboard-openable; Escape closes and restores trigger
 * focus; the parent moves focus into the composer when "Type" is chosen.
 */
export const AddTaskPopover = forwardRef<AddTaskPopoverHandle, Props>(function AddTaskPopover(
  { onAskChat, onTypeManually, noun = "task", className, embedded = false, menuAlign = "left" },
  ref
) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useImperativeHandle(ref, () => ({ focusTrigger: () => triggerRef.current?.focus() }), []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Move focus onto the first action when the popover opens (keyboard entry).
  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  // Pick an action: close the popover, then run it. We do NOT restore trigger
  // focus here — "Type" hands focus to the composer, "Ask chat" to the rail.
  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Add ${noun}`}
        onClick={() => setOpen((value) => !value)}
        className={
          embedded
            ? `flex h-8 w-8 items-center justify-center rounded-pill border border-transparent bg-transparent text-lg leading-none text-ink-muted transition hover:bg-active-raised hover:text-ink ${MENU_BTN_FOCUS}`
            : `flex h-9 w-9 items-center justify-center rounded-pill border border-border bg-surface text-lg leading-none text-ink-muted transition hover:text-ink ${MENU_BTN_FOCUS}`
        }
      >
        <span aria-hidden>+</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Add ${noun}`}
          className={`absolute top-11 z-overlay w-64 rounded-card border border-border bg-surface p-1.5 shadow-overlay ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => choose(onAskChat)}
            className={`flex w-full flex-col items-start gap-0.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-2 ${MENU_BTN_FOCUS}`}
          >
            <span className="text-body font-medium text-ink">Ask chat</span>
            <span className="text-caption text-ink-muted">
              Describe what you need — chat drafts the {noun}s
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onTypeManually)}
            className={`mt-0.5 flex w-full flex-col items-start gap-0.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-2 ${MENU_BTN_FOCUS}`}
          >
            <span className="text-body text-ink">Type {noun}s</span>
            <span className="text-caption text-ink-muted">Enter them yourself</span>
          </button>
        </div>
      ) : null}
    </div>
  );
});
