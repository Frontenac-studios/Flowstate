"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { useTRPC } from "@/trpc/client";

import { InboxPanel } from "./inbox/InboxPanel";

/**
 * Bottom inbox drawer (toggled by ⌃I). Chat now lives in the right-side
 * ChatRail, so this dock is inbox-only. It is mounted on the triage surfaces
 * (Today / Week) via PlanSurface and will become a fully contextual panel in a
 * later phase.
 */
export function BottomDock() {
  const [inboxOpen, setInboxOpen] = useInboxOpen();

  const trpc = useTRPC();
  const { data: triage = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const inboxCount = triage.length;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 sm:px-6 lg:px-10">
      <div className="pointer-events-auto w-full max-w-[110rem]">
        <div className="glass-panel-strong mx-auto overflow-hidden rounded-b-none">
          {!inboxOpen ? (
            <div className="flex items-center gap-2 px-4 py-2">
              <button
                type="button"
                onClick={() => setInboxOpen(true)}
                className="flex items-center gap-1.5 rounded-[var(--kash-radius-chip)] px-2 py-1 text-sm text-kash-ink-muted transition hover:text-kash-ink"
                title="Inbox (⌃I)"
              >
                📥 Inbox
                {inboxCount > 0 ? (
                  <span className="rounded-full bg-[var(--kash-accent-soft)] px-1.5 text-xs text-kash-accent">
                    {inboxCount}
                  </span>
                ) : null}
              </button>
              <span className="ml-auto hidden text-xs text-kash-ink-muted sm:block">⌃I inbox</span>
            </div>
          ) : (
            <div className="flex max-h-[42vh] flex-col">
              <div className="flex items-center gap-1 border-b border-[var(--kash-glass-border)] px-3 py-2">
                <span className="rounded-[var(--kash-radius-chip)] bg-[var(--kash-accent-soft)] px-2.5 py-1 text-sm text-kash-accent">
                  {inboxCount > 0 ? `📥 Inbox ${inboxCount}` : "📥 Inbox"}
                </span>
                <button
                  type="button"
                  onClick={() => setInboxOpen(false)}
                  className="glass-icon-btn ml-auto text-kash-ink-muted"
                  aria-label="Collapse inbox"
                  title="Collapse"
                >
                  ⌄
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <InboxPanel active={inboxOpen} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
