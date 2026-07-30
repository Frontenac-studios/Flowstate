"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  Check,
  Pencil,
  SkipForward,
  Trash2,
  Undo2,
  kashIconProps,
} from "@/components/kash/ui/icon";

type Props = {
  /** Viewport coordinates of the right-click (the menu opens at the cursor). */
  x: number;
  y: number;
  completed: boolean;
  /** Recurring occurrences delete as "Skip this occurrence". */
  isRecurringOccurrence?: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left text-body transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2";

const MENU_WIDTH_PX = 208;
const VIEWPORT_MARGIN_PX = 8;

/**
 * The one right-click menu shared by every task row (D6): Complete / Edit /
 * Delete, with Complete flipping to "Mark not done" on a completed task and
 * Delete reading "Skip this occurrence" on a recurring one. (Move is a planned
 * fast-follow.) Opens at the cursor, clamped into the viewport; closes on
 * Escape, outside click, or any action.
 */
export default function TaskContextMenu({
  x,
  y,
  completed,
  isRecurringOccurrence = false,
  onComplete,
  onEdit,
  onDelete,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Clamp into the viewport once measured, so a right-click near an edge doesn't
  // push the menu off-screen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - VIEWPORT_MARGIN_PX;
    const maxY = window.innerHeight - rect.height - VIEWPORT_MARGIN_PX;
    setPos({
      x: Math.max(VIEWPORT_MARGIN_PX, Math.min(x, maxX)),
      y: Math.max(VIEWPORT_MARGIN_PX, Math.min(y, maxY)),
    });
    el.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? []
      );
      if (items.length === 0) return;
      const current = items.findIndex((el) => el === document.activeElement);
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = (current + delta + items.length) % items.length;
      items[next]!.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Task actions"
      className="fixed z-overlay flex flex-col rounded-card border border-border bg-surface p-1.5 shadow-overlay"
      style={{ left: pos.x, top: pos.y, width: MENU_WIDTH_PX }}
    >
      <button
        type="button"
        role="menuitem"
        className={`${ITEM_CLASS} text-ink`}
        onClick={run(onComplete)}
      >
        {completed ? (
          <Undo2 {...kashIconProps({ tokenSize: "sm", className: "text-ink-muted" })} aria-hidden />
        ) : (
          <Check
            {...kashIconProps({ tokenSize: "sm", className: "text-[var(--action-complete)]" })}
            aria-hidden
          />
        )}
        {completed ? "Mark not done" : "Complete"}
      </button>
      <button
        type="button"
        role="menuitem"
        className={`${ITEM_CLASS} text-ink`}
        onClick={run(onEdit)}
      >
        <Pencil {...kashIconProps({ tokenSize: "sm", className: "text-ink-muted" })} aria-hidden />
        Edit
      </button>
      <button
        type="button"
        role="menuitem"
        className={`${ITEM_CLASS} ${isRecurringOccurrence ? "text-ink" : "text-[var(--action-danger)]"}`}
        onClick={run(onDelete)}
      >
        {isRecurringOccurrence ? (
          <SkipForward
            {...kashIconProps({ tokenSize: "sm", className: "text-ink-muted" })}
            aria-hidden
          />
        ) : (
          <Trash2 {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
        )}
        {isRecurringOccurrence ? "Skip this occurrence" : "Delete"}
      </button>
    </div>
  );
}
