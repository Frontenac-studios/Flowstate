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

import Menu from "@/components/kash/ui/Menu";
import { MENU_ROW } from "@/components/kash/ui/overlay-styles";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/cn";
import { FLAGS } from "@/lib/flags";

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
  /** Spec v5 page header: a primary "Add task" pill instead of the "+" icon. */
  labelled?: boolean;
};

const TRIGGER_EMBEDDED =
  "flex h-8 w-8 items-center justify-center rounded-pill border border-transparent bg-transparent text-lg leading-none text-ink-muted transition hover:bg-active-raised hover:text-ink aria-expanded:bg-tint-open aria-expanded:text-ink kash-focus-visible outline-none";
const TRIGGER_LABELLED =
  "flex h-9 items-center justify-center gap-1.5 rounded-pill bg-accent px-4 text-[14px] font-semibold text-accent-on transition-colors hover:bg-primary-hover active:bg-primary-pressed aria-expanded:bg-primary-pressed kash-focus-visible outline-none motion-reduce:transition-none";
const TRIGGER_STANDALONE =
  "flex h-9 w-9 items-center justify-center rounded-pill border border-border bg-surface text-lg leading-none text-ink-muted transition hover:text-ink aria-expanded:bg-tint-open aria-expanded:text-ink kash-focus-visible outline-none";

/** A two-line menu row (label + caption): MENU_ROW, grown past its fixed 36px. */
const TWO_LINE_ROW = cn(MENU_ROW, "!h-auto flex-col !items-start !gap-0.5 py-2");

/**
 * Compact "+" that de-emphasizes the manual composers (Phase 5): chat is the
 * primary way to create tasks, with typing kept as a quiet fallback. Opens a
 * two-choice popover — "Ask chat" (featured) or "Type <noun>s" (reveals the
 * collapsed composer). Keyboard-openable; Escape closes and restores trigger
 * focus; the parent moves focus into the composer when "Type" is chosen.
 */
export const AddTaskPopover = forwardRef<AddTaskPopoverHandle, Props>(function AddTaskPopover(
  {
    onAskChat,
    onTypeManually,
    noun = "task",
    className,
    embedded = false,
    menuAlign = "left",
    labelled = false,
  },
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

  // Escape and outside presses both close; close() also hands focus back to the "+".
  useDismiss(open, [containerRef], close);

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

  // Chat parked (docs/v1-scope.md §3.2). The popover exists only to choose
  // between chat and the manual composer; with chat gone there is nothing to
  // choose, so "+" reveals the composer directly. Without this, "+" would open a
  // one-item menu and task creation would gain a pointless click.
  const triggerClass = labelled
    ? TRIGGER_LABELLED
    : embedded
      ? TRIGGER_EMBEDDED
      : TRIGGER_STANDALONE;
  const triggerContent = labelled ? <span>Add {noun}</span> : <span aria-hidden>+</span>;

  if (!FLAGS.chat) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Add ${noun}`}
          onClick={onTypeManually}
          className={triggerClass}
        >
          {triggerContent}
        </button>
      </div>
    );
  }

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
        className={triggerClass}
      >
        {triggerContent}
      </button>

      {open ? (
        <Menu
          id={menuId}
          aria-label={`Add ${noun}`}
          className={cn(
            "absolute top-full mt-1 w-64",
            menuAlign === "right" ? "right-0" : "left-0"
          )}
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => choose(onAskChat)}
            className={TWO_LINE_ROW}
          >
            <span className="text-[14px] font-medium text-ink">Ask chat</span>
            <span className="text-caption font-normal text-ink-muted">
              Describe what you need — chat drafts the {noun}s
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onTypeManually)}
            className={TWO_LINE_ROW}
          >
            <span className="text-[14px] font-medium text-ink">Type {noun}s</span>
            <span className="text-caption font-normal text-ink-muted">Enter them yourself</span>
          </button>
        </Menu>
      ) : null}
    </div>
  );
});
