"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { createCaptureContext } from "@/lib/chat/capture-context";
import { COMPOSER_DRAFT_KEYS } from "@/lib/composer/composer-draft-constants";

import { useChat } from "../../chat/ChatProvider";
import { AddTaskPopover, type AddTaskPopoverHandle } from "../AddTaskPopover";
import { usePlanMode } from "../PlanProvider";
import { QuickInput, type QuickInputHandle } from "../QuickInput";

import { OverduePopover } from "./OverduePopover";

type Props = {
  /** Date range subtitle, e.g. "Jul 13 – Jul 19". */
  weekRange: string;
  /** Overdue + unscheduled triage count; the chip is hidden when 0. */
  overdueCount: number;
  /** Whether the inline reflection panel is expanded. */
  reflectionOpen: boolean;
  onToggleReflection: () => void;
};

const ACTION_BTN =
  "rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]";

/**
 * Care-style page header for This Week: an `h1` + date-range subtitle with a
 * right-aligned action cluster (overdue triage chip, default-week setup,
 * reflection toggle, and the relocated task composer). The composer keeps the
 * AddTaskPopover behavior — "Ask chat" opens the rail, "Type tasks" reveals an
 * inline QuickInput that creates unscheduled tasks in Plan Tasks.
 */
export function WeekHeader({ weekRange, overdueCount, reflectionOpen, onToggleReflection }: Props) {
  const { openRail } = useChat();
  const { touchActivity } = usePlanMode();
  const [composerOpen, setComposerOpen] = useState(false);
  const quickInputRef = useRef<QuickInputHandle>(null);
  const addTaskRef = useRef<AddTaskPopoverHandle>(null);

  return (
    <section className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 font-semibold text-ink">This Week</h1>
          <p className="text-meta text-ink-faint">{weekRange}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {overdueCount > 0 ? <OverduePopover count={overdueCount} /> : null}
          <Link href="/settings" className={ACTION_BTN}>
            Default week
          </Link>
          <button
            type="button"
            onClick={onToggleReflection}
            aria-pressed={reflectionOpen}
            className={
              reflectionOpen
                ? "rounded-pill border border-border bg-active-surface px-3 py-1.5 text-sm text-ink transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
                : ACTION_BTN
            }
          >
            Reflection
          </button>
          <AddTaskPopover
            ref={addTaskRef}
            onAskChat={() =>
              openRail({
                captureContext: createCaptureContext({
                  surface: "week",
                  defaultBucket: "inbox",
                }),
              })
            }
            onTypeManually={() => {
              setComposerOpen(true);
              requestAnimationFrame(() => quickInputRef.current?.focus());
            }}
          />
        </div>
      </div>

      {composerOpen ? (
        <div
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setComposerOpen(false);
              requestAnimationFrame(() => addTaskRef.current?.focusTrigger());
            }
          }}
        >
          <QuickInput
            ref={quickInputRef}
            draftStorageKey={COMPOSER_DRAFT_KEYS.planWeek}
            createInInbox
            onTaskCreated={() => touchActivity()}
          />
        </div>
      ) : null}
    </section>
  );
}
