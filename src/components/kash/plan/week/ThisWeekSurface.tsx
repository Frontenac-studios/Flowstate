"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
import { LensControlBar } from "@/components/kash/plan/LensControlBar";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanSurface } from "@/components/kash/plan/PlanSurface";
import { WeekCanvas } from "@/components/kash/plan/week/WeekCanvas";
import { GhostCategoryStrip } from "@/components/kash/ui/GhostCategoryStrip";
import WeeklySummaryCard from "@/components/kash/week/WeeklySummaryCard";
import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { partitionWeekTasks } from "@/lib/week/partition-week-tasks";
import { weekHasPlanningData } from "@/lib/week/week-has-data";
import { useTRPC } from "@/trpc/client";

export function ThisWeekSurface() {
  const trpc = useTRPC();
  const localDate = useLocalCalendarDate();
  const weekRef = useMemo(() => parseISODateString(localDate), [localDate]);
  const weekDates = useMemo(() => datesInIsoWeek(weekRef).map(toISODateString), [weekRef]);
  const anchorDate = weekDates[0] ?? localDate;
  const weekQueryInput = useMemo(() => ({ anchorDate }), [anchorDate]);

  const { data: tasks = [] } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: protectedBlocks = [] } = useQuery(
    trpc.protectedBlocks.listForWeek.queryOptions(weekQueryInput)
  );
  const { data: dayPriorities = [] } = useQuery(
    trpc.weekDayPriorities.listForWeek.queryOptions(weekQueryInput)
  );

  const partitioned = useMemo(() => partitionWeekTasks(tasks, weekRef), [tasks, weekRef]);

  const hasWeekPlanData = useMemo(
    () =>
      weekHasPlanningData({
        weekDates,
        tasks,
        protectedBlockCount: protectedBlocks.length,
        dayPriorityCount: dayPriorities.length,
      }) || partitioned.inbox.length > 0,
    [weekDates, tasks, protectedBlocks.length, dayPriorities.length, partitioned.inbox.length]
  );

  return (
    <PlanSurface>
      <ContextualInbox />
      <LensProvider scope="this-week">
        {hasWeekPlanData ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <LensControlBar />
          </div>
        ) : null}
        <WeekCanvas surface="week" showWeekChrome={hasWeekPlanData} />
      </LensProvider>
      {hasWeekPlanData ? (
        <div className="mt-4">
          <WeeklySummaryCard />
        </div>
      ) : (
        <div className="mt-4 rounded-card border border-subtle bg-surface px-4 py-3 shadow-surface">
          <GhostCategoryStrip className="mx-auto w-40" />
          <p className="mt-2 text-center text-sm text-ink-muted">
            Schedule tasks on the week grid — summary fills in as your plan takes shape.
          </p>
        </div>
      )}
    </PlanSurface>
  );
}
