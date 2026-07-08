"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { Archive, CalendarPlus, kashIconProps } from "@/components/kash/ui/icon";

/** Drop a task here to roll it into next week's plan (schedules to next Monday). */
export const WEEK_LATER_NEXT_WEEK_DROP_ID = "week-later:nextweek";
/** Drop a task here to park it in the Backlog (Abyss) — not the inbox. */
export const WEEK_LATER_BACKLOG_DROP_ID = "week-later:backlog";

type ZoneProps = {
  id: string;
  icon: ReactNode;
  title: string;
  caption: string;
  tint: string;
};

function LaterZone({ id, icon, title, caption, tint }: ZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-row border border-dashed border-subtle p-2 text-center transition ${
        isOver ? "shadow-[inset_0_0_0_2px_var(--accent-soft)]" : ""
      }`}
      style={{ backgroundColor: tint }}
    >
      <span className="text-ink-muted" aria-hidden>
        {icon}
      </span>
      <span className="text-xs font-medium text-ink">{title}</span>
      <span className="text-meta text-ink-faint">{caption}</span>
    </div>
  );
}

/**
 * The eighth "day" of the week grid: a defer column that sits after Sunday.
 * Purely a drag target (no task list) — the top zone rolls a task into next
 * week's plan, the bottom zone parks it in the Backlog. Styled to echo the day
 * columns while reading as distinct (dashed border, canvas fill).
 */
export function WeekLaterColumn() {
  return (
    <div
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-dashed border-subtle bg-surface-2"
      aria-label="Defer to next week or backlog"
    >
      <div className="px-2 pb-2 pt-3 text-center">
        <p className="text-sm font-medium text-ink-muted">Later</p>
        <p className="text-meta text-ink-faint">drop to defer</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
        <LaterZone
          id={WEEK_LATER_NEXT_WEEK_DROP_ID}
          icon={<CalendarPlus {...kashIconProps({ tokenSize: "sm" })} />}
          title="Next week"
          caption="rolls to next week's plan"
          tint="var(--accent-soft)"
        />
        <LaterZone
          id={WEEK_LATER_BACKLOG_DROP_ID}
          icon={<Archive {...kashIconProps({ tokenSize: "sm" })} />}
          title="Backlog"
          caption="parks, not inbox"
          tint="var(--active-surface)"
        />
      </div>
    </div>
  );
}
