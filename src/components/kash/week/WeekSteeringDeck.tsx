"use client";

import { useQuery } from "@tanstack/react-query";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useTRPC } from "@/trpc/client";
import { BetsBlock } from "./BetsBlock";
import { ComingUpBlock } from "./ComingUpBlock";
import { GoneQuietPreview } from "./GoneQuietPreview";
import { OffTargetBanner } from "./OffTargetBanner";
import { RunningHotBlock } from "./RunningHotBlock";
import { WaitingOnYouBlock } from "./WaitingOnYouBlock";

/**
 * "Gone quiet" cell — the W7 stale preview; conditional, absent when nothing is
 * stale. Its own query lane, so the Sweep read never blocks the bets or the grid.
 */
function GoneQuietCell({ onOpenSweep }: { onOpenSweep: () => void }) {
  const trpc = useTRPC();
  const { data: draft } = useQuery(trpc.sweep.draft.queryOptions());
  if (!draft || draft.totalStale === 0) return null;
  return <GoneQuietPreview draft={draft} onOpenSweep={onOpenSweep} />;
}

/**
 * W14 — the Week steering deck. A 2×2 block deck above the 7+1 grid — Waiting on you,
 * The bets, Coming up, Gone quiet — under a full-width off-target banner that appears
 * only on drift. It ASSEMBLES data that lives elsewhere (Projects, Money, the Sweep);
 * it does not duplicate those views. Each block owns its own query lane, so a slow one
 * never blocks the others or the grid; conditional blocks (off-target, Gone quiet)
 * self-hide when empty. The deck always reads "now", independent of the grid's paging.
 */
export function WeekSteeringDeck({ onOpenSweep }: { onOpenSweep: () => void }) {
  const localDate = useLocalCalendarDate();
  const tzOffsetMinutes = -new Date().getTimezoneOffset();

  return (
    <div className="flex flex-col gap-3">
      <OffTargetBanner tzOffsetMinutes={tzOffsetMinutes} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <WaitingOnYouBlock />
        <BetsBlock />
        <ComingUpBlock localDate={localDate} />
        <GoneQuietCell onOpenSweep={onOpenSweep} />
      </div>
      {/*
        W15 — running hot. Below the 2×2 rather than inside it: the deck's four cells
        are always present, and this one renders nothing at all when no project is
        overrunning. A fifth permanent cell that is usually empty would cost the deck
        its shape to say "everything is fine".
      */}
      <RunningHotBlock />
    </div>
  );
}
