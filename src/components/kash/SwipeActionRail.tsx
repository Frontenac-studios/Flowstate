"use client";

import type { MouseEvent } from "react";

import { kashIconProps, type LucideIcon } from "@/components/kash/ui/icon";

/** One action cap. Keep in sync with the reveal widths passed to useTrackpadSwipeReveal. */
export const SWIPE_ACTION_WIDTH_PX = 44;

/** Total reveal for a rail of `count` caps. */
export function swipeRevealWidth(count: number): number {
  return count * SWIPE_ACTION_WIDTH_PX;
}

export type SwipeActionTone = "edit" | "complete" | "danger" | "neutral";

const TONE_COLOR: Record<SwipeActionTone, string> = {
  edit: "var(--action-edit)",
  complete: "var(--action-complete)",
  danger: "var(--action-danger)",
  neutral: "var(--ink-muted)",
};

export type SwipeAction = {
  key: string;
  /** Accessible name — the rail is icon-only, so this is the only label. */
  label: string;
  icon: LucideIcon;
  tone: SwipeActionTone;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
};

type Props = {
  actions: SwipeAction[];
  /** Snapped open state — not the live gesture offset (see MillerTaskRow). */
  open: boolean;
  /**
   * Negative margins that cancel the parent row's padding so the rail bleeds to the
   * row's own edge. Without it the caps float inside the padding and stop reading as
   * part of the row shape.
   */
  className?: string;
};

/**
 * The two-finger swipe reveal rail.
 *
 * Renders in-flow as the last flex child of the row rather than absolutely on top of
 * it: the row keeps its position and its title reflows into the narrower column, so
 * the task stays readable while the actions are open. The rail is one continuous
 * --surface-2 tail split by a single hairline — no per-button border or radius, so
 * the row plus its caps read as a single object that simply got longer.
 */
export default function SwipeActionRail({ actions, open, className = "" }: Props) {
  return (
    <div
      aria-hidden={!open}
      className={`flex shrink-0 self-stretch overflow-hidden bg-surface-2 transition-[width] duration-short ease-move ${className}`}
      style={{ width: open ? swipeRevealWidth(actions.length) : 0 }}
    >
      {actions.map((action, index) => {
        const Glyph = action.icon;
        return (
          <button
            key={action.key}
            type="button"
            tabIndex={open ? 0 : -1}
            disabled={action.disabled}
            aria-label={action.label}
            title={action.label}
            onClick={action.onClick}
            style={{ width: SWIPE_ACTION_WIDTH_PX, color: TONE_COLOR[action.tone] }}
            className={`flex shrink-0 items-center justify-center focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
              index > 0 ? "border-l border-subtle" : ""
            } ${
              action.disabled
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-[var(--surface-selected)]"
            }`}
          >
            <Glyph {...kashIconProps({ tokenSize: "md" })} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
