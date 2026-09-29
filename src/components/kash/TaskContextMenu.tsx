"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Check,
  Pencil,
  SkipForward,
  Trash2,
  Undo2,
  kashIconProps,
} from "@/components/kash/ui/icon";
import Menu, { MenuDivider, MenuItem } from "@/components/kash/ui/Menu";
import { useDismiss } from "@/hooks/useDismiss";

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

  // Arrow keys / Home / End are the Menu's; this closes on outside press + Escape.
  useDismiss(true, [ref], onClose);

  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  // Portaled: a task row keeps a transform from its arrival animation, which turns
  // `position: fixed` into "relative to the row" and clips the menu to the row.
  return createPortal(
    <Menu
      ref={ref}
      aria-label="Task actions"
      className="fixed"
      style={{ left: pos.x, top: pos.y, width: MENU_WIDTH_PX }}
    >
      <MenuItem onClick={run(onComplete)}>
        <span className="flex items-center gap-2.5">
          {completed ? (
            <Undo2
              {...kashIconProps({ tokenSize: "sm", className: "text-ink-muted" })}
              aria-hidden
            />
          ) : (
            <Check
              {...kashIconProps({ tokenSize: "sm", className: "text-[var(--action-complete)]" })}
              aria-hidden
            />
          )}
          {completed ? "Mark not done" : "Complete"}
        </span>
      </MenuItem>
      <MenuItem onClick={run(onEdit)}>
        <span className="flex items-center gap-2.5">
          <Pencil
            {...kashIconProps({ tokenSize: "sm", className: "text-ink-muted" })}
            aria-hidden
          />
          Edit
        </span>
      </MenuItem>
      <MenuDivider />
      <MenuItem destructive={!isRecurringOccurrence} onClick={run(onDelete)}>
        <span className="flex items-center gap-2.5">
          {isRecurringOccurrence ? (
            <SkipForward
              {...kashIconProps({ tokenSize: "sm", className: "text-ink-muted" })}
              aria-hidden
            />
          ) : (
            <Trash2 {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
          )}
          {isRecurringOccurrence ? "Skip this occurrence" : "Delete"}
        </span>
      </MenuItem>
    </Menu>,
    document.body
  );
}
