"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/kash/ui/Button";
import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import { useTRPC } from "@/trpc/client";

import { GardenScene } from "./GardenScene";
import { RestorativeTimeCard } from "./RestorativeTimeCard";
import { useGardenNourishPulse } from "./useGardenNourishPulse";

type Props = { onOpenBreathing?: () => void };

export function CareGardenHome({ onOpenBreathing }: Props) {
  const trpc = useTRPC();
  const [promptDismissed, setPromptDismissed] = useState(false);

  const gardenQuery = useQuery(trpc.care.getGardenState.queryOptions());
  const liftsQuery = useQuery(trpc.care.getLiftsMe.queryOptions());
  const nourishmentsQuery = useQuery(trpc.care.recentWinNourishments.queryOptions({ limit: 8 }));

  const { activeBeat, pulseKey } = useGardenNourishPulse(nourishmentsQuery.data);
  const garden = gardenQuery.data;
  const lifts = liftsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
        <GardenScene
          nourishCount={garden?.nourishCount ?? 0}
          growthTier={garden?.growthTier ?? 0}
          lifeState={garden?.lifeState ?? "active"}
          nourishBeat={activeBeat}
          nourishPulseKey={pulseKey}
        />
        <div className="flex flex-col gap-3">
          <section className="rounded-card border border-subtle bg-surface p-3 shadow-surface">
            <h2 className="mb-2 text-caption font-medium text-ink-muted">What lifts me</h2>
            {liftsQuery.isLoading ? (
              <p className="text-meta text-ink-faint">Loading…</p>
            ) : liftsQuery.isError ? (
              <QueryErrorNotice
                message="What lifts you didn't load."
                onRetry={() => void liftsQuery.refetch()}
              />
            ) : lifts.length === 0 ? (
              <p className="text-meta text-ink-faint">
                Heart a practice in Tasks, or return to regulars over time.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {lifts.map((lift) => (
                  <span
                    key={lift.activityId}
                    className="rounded-chip bg-[var(--cat-body-mind-fill)] px-2.5 py-1 text-meta text-[var(--cat-body-mind-text)]"
                  >
                    {lift.reason === "explicit" ? "♥ " : ""}
                    {lift.title}
                  </span>
                ))}
              </div>
            )}
          </section>
          {!promptDismissed ? (
            <section className="rounded-card border border-subtle bg-surface-2 p-3 shadow-surface">
              <h2 className="mb-1.5 text-caption font-medium text-ink-muted">A gentle prompt</h2>
              <p className="mb-2.5 text-body leading-snug text-ink">
                You&apos;ve been heads-down a while. Want to take five slow breaths?
              </p>
              <div className="flex gap-2">
                <Button type="button" className="text-caption" onClick={onOpenBreathing}>
                  Breathe
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-caption"
                  onClick={() => setPromptDismissed(true)}
                >
                  Not now
                </Button>
              </div>
            </section>
          ) : null}
          <RestorativeTimeCard />
        </div>
      </div>
    </div>
  );
}
