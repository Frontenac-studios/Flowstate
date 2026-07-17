"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Inbox, kashIconProps } from "@/components/kash/ui/icon";
import IconButton from "@/components/kash/ui/IconButton";
import { ShortcutHint } from "@/components/kash/ui/ShortcutHint";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { useTRPC } from "@/trpc/client";

import { LensControlBar } from "../plan/LensControlBar";
import { LensProvider } from "../plan/LensProvider";
import { InboxPanel } from "./InboxPanel";

/**
 * Contextual triage inbox: an in-flow, collapsible strip (toggled by ⌃I).
 * Today mounts it at the bottom of the page; Plan keeps it above the horizon
 * chrome. Replaces the retired global BottomDock and is mounted only on the
 * surfaces where re-scheduling overdue tasks is meaningful (Today / Week /
 * Plan, minus the Goals/bingo horizon), so the ⌃I binding is scoped to those
 * routes.
 */
export function ContextualInbox({ placement = "top" }: { placement?: "top" | "bottom" }) {
  const trpc = useTRPC();
  const [open, setOpen] = useInboxOpen();

  const { data: countData } = useQuery({
    ...trpc.tasks.countTriageCandidates.queryOptions(),
    enabled: !open,
  });
  const { data: triage, isLoading: isLoadingTriage } = useQuery({
    ...trpc.tasks.listTriageCandidates.queryOptions(),
    enabled: open,
  });
  const inboxCount = open ? (triage?.length ?? countData?.count ?? 0) : (countData?.count ?? 0);

  useAutoOpenOnTriageGrowth({ open, setOpen, count: countData?.count });

  // Nothing to triage and collapsed → render nothing (no dead inbox bar). The
  // count query and ⌃I/auto-open hooks above stay mounted, so the strip
  // reappears the moment a task lands in the inbox.
  if (!open && inboxCount === 0) return null;

  return (
    <LensProvider scope="inbox" bindKeys={false} properties={["category", "project"]}>
      <div
        className={`shrink-0 overflow-hidden rounded-card border border-border bg-surface shadow-surface ${
          placement === "bottom" ? "mt-stack" : "mb-stack"
        }`}
      >
        {!open ? (
          <div className="flex items-center gap-2 px-4 py-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="focus-visible:text-on-accent flex items-center gap-1.5 rounded-chip px-2 py-1 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:bg-ink"
              title="Inbox (⌃I)"
            >
              <Inbox {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
              Inbox
              {inboxCount > 0 ? (
                <span className="rounded-full bg-[var(--accent-soft)] px-1.5 text-xs text-accent">
                  {inboxCount}
                </span>
              ) : null}
            </button>
            <ShortcutHint
              label="inbox"
              keys="⌃I"
              className="ml-auto hidden text-xs text-ink-muted sm:inline-flex"
            />
          </div>
        ) : (
          <div className="flex max-h-[42vh] flex-col">
            <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-2">
              <span className="flex items-center gap-1.5 rounded-chip bg-[var(--accent-soft)] px-2.5 py-1 text-sm text-accent">
                <Inbox {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
                {inboxCount > 0 ? `Inbox ${inboxCount}` : "Inbox"}
              </span>
              <IconButton
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto"
                aria-label="Collapse inbox"
                title="Collapse"
              >
                ⌄
              </IconButton>
            </div>

            <div className="border-b border-[var(--border)] px-3 py-2">
              <LensControlBar />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <InboxPanel active={open} tasks={triage ?? []} isLoading={isLoadingTriage} />
            </div>
          </div>
        )}
      </div>
    </LensProvider>
  );
}

/**
 * Decides whether a triage-count update should open the inbox.
 * `previousCount === null` seeds the baseline without opening (existing items
 * on mount/navigation must not force-open).
 */
export function shouldAutoOpenOnTriageGrowth(
  previousCount: number | null,
  nextCount: number,
  currentlyOpen: boolean
): { shouldOpen: boolean; nextPrevious: number } {
  if (previousCount === null) {
    return { shouldOpen: false, nextPrevious: nextCount };
  }
  return {
    shouldOpen: nextCount > previousCount && !currentlyOpen,
    nextPrevious: nextCount,
  };
}

/** Opens the inbox when triage count rises after the initial baseline is seeded. */
function useAutoOpenOnTriageGrowth({
  open,
  setOpen,
  count,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number | undefined;
}) {
  const previousCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (count === undefined) return;

    const { shouldOpen, nextPrevious } = shouldAutoOpenOnTriageGrowth(
      previousCountRef.current,
      count,
      open
    );
    previousCountRef.current = nextPrevious;
    if (shouldOpen) setOpen(true);
  }, [count, open, setOpen]);
}

/** Local inbox-open state plus a ⌃I toggle. */
function useInboxOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || e.key.toLowerCase() !== "i") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return [open, setOpen] as const;
}
