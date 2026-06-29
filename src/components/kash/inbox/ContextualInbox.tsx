"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import IconButton from "@/components/kash/ui/IconButton";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { useTRPC } from "@/trpc/client";

import { LensControlBar } from "../plan/LensControlBar";
import { LensProvider } from "../plan/LensProvider";
import { InboxPanel } from "./InboxPanel";

/**
 * Contextual triage inbox: an in-flow, collapsible strip at the top of the
 * content column (toggled by ⌃I). Replaces the retired global BottomDock and is
 * mounted only on the surfaces where re-scheduling overdue tasks is meaningful
 * (Today / Week / Plan), so the ⌃I binding is scoped to those routes.
 */
export function ContextualInbox() {
  const [open, setOpen] = useInboxOpen();

  const trpc = useTRPC();
  const { data: triage = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const inboxCount = triage.length;

  return (
    <LensProvider scope="inbox" bindKeys={false} properties={["category", "project"]}>
      <div className="mb-4 overflow-hidden rounded-card border border-border bg-surface shadow-overlay">
        {!open ? (
          <div className="flex items-center gap-2 px-4 py-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--radius-chip)] px-2 py-1 text-sm text-ink-muted transition hover:text-ink"
              title="Inbox (⌃I)"
            >
              📥 Inbox
              {inboxCount > 0 ? (
                <span className="rounded-full bg-[var(--accent-soft)] px-1.5 text-xs text-accent">
                  {inboxCount}
                </span>
              ) : null}
            </button>
            <span className="ml-auto hidden text-xs text-ink-muted sm:block">⌃I inbox</span>
          </div>
        ) : (
          <div className="flex max-h-[42vh] flex-col">
            <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-2">
              <span className="rounded-[var(--radius-chip)] bg-[var(--accent-soft)] px-2.5 py-1 text-sm text-accent">
                {inboxCount > 0 ? `📥 Inbox ${inboxCount}` : "📥 Inbox"}
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
              <InboxPanel active={open} />
            </div>
          </div>
        )}
      </div>
    </LensProvider>
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
