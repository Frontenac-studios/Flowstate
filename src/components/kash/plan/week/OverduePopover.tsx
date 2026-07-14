"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { InboxPanel } from "@/components/kash/inbox/InboxPanel";
import { useTRPC } from "@/trpc/client";

import { LensProvider } from "../LensProvider";

type Props = {
  /** Overdue + unscheduled count driving the chip label. */
  count: number;
};

/**
 * Header affordance replacing the always-mounted ContextualInbox on This Week:
 * an "N overdue" chip that opens a small popover rendering {@link InboxPanel}
 * with the Today/Tomorrow/Later/Drop triage actions. The candidate list is
 * fetched only while the popover is open.
 */
export function OverduePopover({ count }: Props) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: triage, isLoading } = useQuery({
    ...trpc.tasks.listTriageCandidates.queryOptions(),
    enabled: open,
  });

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
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <LensProvider scope="inbox" bindKeys={false} properties={["category", "project"]}>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-pill bg-[var(--accent-soft)] px-3 py-1.5 text-sm text-accent transition hover:opacity-90 focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        >
          <span className="font-medium">{count}</span> overdue
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Overdue triage"
            className="absolute right-0 top-11 z-overlay flex max-h-[60vh] w-[min(28rem,90vw)] flex-col overflow-hidden rounded-card border border-border bg-surface p-3 shadow-overlay"
          >
            <p className="mb-2 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Overdue &amp; unscheduled
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <InboxPanel active={open} tasks={triage ?? []} isLoading={isLoading} />
            </div>
          </div>
        ) : null}
      </div>
    </LensProvider>
  );
}
