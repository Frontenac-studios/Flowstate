"use client";

import { goalsCoachThreadId } from "@/lib/chat/threads";
import type { ProjectCategory } from "@/lib/projects/categories";

import PlanCoachDock from "./PlanCoachDock";

type Props = {
  year: number;
  /* When set, the category-balance indicator renders pinned under the
     composer as a silent footer. */
  balance?: Record<ProjectCategory, number>;
};

/**
 * Goals coach — a bespoke chat dock beside the bingo grid. Reuses the shared
 * PlanCoachDock with surface "goals", so it runs the Goals register + goal tools
 * and never behaves like the task rail. One persistent thread per card year lets
 * an unfinished session resume later.
 */
export default function BingoCoachDock({ year, balance }: Props) {
  return (
    <PlanCoachDock
      threadId={goalsCoachThreadId(year)}
      surface="goals"
      title="Goals coach"
      subtitle="Shape your year, one goal at a time."
      placeholder="Tell the coach about your year…"
      emptyTitle="Not sure what to put on your card?"
      emptyBody="Tell me a bit about the year you want — what you'd be proud of, what you keep meaning to do — and I'll help you shape a few goals."
      balance={balance}
    />
  );
}
