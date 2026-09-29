"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { InboxPanel } from "@/components/kash/inbox/InboxPanel";
import { OVERLAY_CARD } from "@/components/kash/ui/overlay-styles";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/cn";
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

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [containerRef], close);

  return (
    <LensProvider scope="inbox" bindKeys={false} properties={["category", "project"]}>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="kash-focus-visible inline-flex items-center gap-1.5 rounded-pill bg-[var(--accent-soft)] px-3 py-1.5 text-sm text-accent transition hover:opacity-90 focus:outline-none"
        >
          <span className="font-medium">{count}</span> overdue
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Overdue triage"
            className={cn(
              OVERLAY_CARD,
              "absolute right-0 top-11 z-overlay flex max-h-[60vh] w-[min(28rem,90vw)] flex-col overflow-hidden"
            )}
          >
            <p className="shrink-0 px-3 pb-1.5 pt-2 text-micro font-semibold uppercase tracking-caps text-ink-muted">
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
