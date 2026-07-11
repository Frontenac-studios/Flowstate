"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { LensControlBar } from "@/components/kash/plan/LensControlBar";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanProvider } from "@/components/kash/plan/PlanProvider";
import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import type { PlanningBreadcrumb } from "@/lib/planning/horizon-storage";
import { resolveWeekAnchorDate } from "@/lib/planning/week-breadcrumb";
import { partitionWeekTasks } from "@/lib/week/partition-week-tasks";
import { weekHasPlanningData } from "@/lib/week/week-has-data";
import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

import { WeekCanvas } from "./WeekCanvas";
import WeekDraftGhosts from "./WeekDraftGhosts";

type Props = {
  breadcrumb: PlanningBreadcrumb;
};

/**
 * `/plan` Week tab — embeds the same WeekCanvas as `/this-week` with the
 * planning rail (inbox + AI draft ghosts) always visible.
 */
export default function WeekPlanView({ breadcrumb }: Props) {
  const trpc = useTRPC();

  const anchorDate = useMemo(() => resolveWeekAnchorDate(breadcrumb), [breadcrumb]);
  const weekRef = useMemo(() => parseISODateString(anchorDate), [anchorDate]);

  const tasksQuery = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const weekQueryInput = useMemo(() => ({ anchorDate }), [anchorDate]);
  const blocksQuery = useQuery(trpc.protectedBlocks.listForWeek.queryOptions(weekQueryInput));
  const protectedBlocks = blocksQuery.data ?? [];
  const prioritiesQuery = useQuery(trpc.weekDayPriorities.listForWeek.queryOptions(weekQueryInput));
  const dayPriorities = prioritiesQuery.data ?? [];
  const isError = tasksQuery.isError || blocksQuery.isError || prioritiesQuery.isError;
  const partitioned = useMemo(() => partitionWeekTasks(tasks, weekRef), [tasks, weekRef]);
  const weekDateIsos = useMemo(() => datesInIsoWeek(weekRef).map(toISODateString), [weekRef]);
  const hasInboxTasks = partitioned.inbox.length > 0;
  const hasWeekPlanData = useMemo(
    () =>
      weekHasPlanningData({
        weekDates: weekDateIsos,
        tasks,
        protectedBlockCount: protectedBlocks.length,
        dayPriorityCount: dayPriorities.length,
      }) || hasInboxTasks,
    [weekDateIsos, tasks, protectedBlocks.length, dayPriorities.length, hasInboxTasks]
  );

  return (
    <PlanProvider>
      <div className="flex flex-col gap-stack">
        <LensProvider scope="this-week">
          {isError ? (
            <QueryErrorNotice
              message="This week didn't load."
              onRetry={() => {
                void tasksQuery.refetch();
                void blocksQuery.refetch();
                void prioritiesQuery.refetch();
              }}
            />
          ) : null}

          {hasWeekPlanData ? (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <LensControlBar />
            </div>
          ) : null}

          <WeekDraftGhosts anchorDate={anchorDate} hasInboxTasks={hasInboxTasks} />

          <WeekCanvas anchorDate={anchorDate} showWeekChrome={hasWeekPlanData} />
        </LensProvider>
      </div>
    </PlanProvider>
  );
}
