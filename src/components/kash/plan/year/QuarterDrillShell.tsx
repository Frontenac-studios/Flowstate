"use client";

import { useQuery } from "@tanstack/react-query";

import { detectQuarterNeglected } from "@/lib/planning/year-heat";
import { useTRPC } from "@/trpc/client";

import NeglectedCategoryCallout from "./NeglectedCategoryCallout";
import QuarterCategoryStrips from "./QuarterCategoryStrips";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

type Props = {
  year: number;
  quarter: number;
};

/** PB2 quarter drill-in: fuller category strips + ON-2 placeholder until PB3. */
export default function QuarterDrillShell({ year, quarter }: Props) {
  const trpc = useTRPC();
  const tzOffsetMinutes = clientTzOffsetMinutes();

  const activityQuery = useQuery(
    trpc.planning.getYearActivity.queryOptions({ year, tzOffsetMinutes })
  );
  const themeQuery = useQuery(
    trpc.planning.getQuarterTheme.queryOptions({ year, quarter: quarter as 1 | 2 | 3 | 4 })
  );

  const quarterData = activityQuery.data?.quarters.find((q) => q.quarter === quarter);
  const weights = quarterData?.categoryWeights;
  const neglected = weights ? detectQuarterNeglected(weights) : [];

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-ink">
          Q{quarter}
          {themeQuery.data?.phrase ? (
            <span className="ml-2 font-normal text-ink-muted">{themeQuery.data.phrase}</span>
          ) : null}
        </h2>
      </div>

      {weights ? <QuarterCategoryStrips weights={weights} /> : null}
      <NeglectedCategoryCallout categories={neglected} scope="quarter" />

      <div className="rounded-card border border-subtle bg-surface p-8 text-sm text-ink-muted">
        Nothing planned yet.
      </div>
    </div>
  );
}
