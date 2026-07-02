"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { useBalancePassTrigger } from "@/components/kash/plan/balance/BalancePassProvider";

import { LensControlBar } from "@/components/kash/plan/LensControlBar";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanModeToggle } from "@/components/kash/plan/PlanModeToggle";
import { PlanProvider } from "@/components/kash/plan/PlanProvider";
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
 * `/plan` Week tab — embeds the same WeekCanvas as `/this-week` with an optional
 * planning rail (inbox + AI draft ghosts) toggled via PlanModeToggle.
 */
export default function WeekPlanView({ breadcrumb }: Props) {
  const trpc = useTRPC();
  const [planRailOpen, setPlanRailOpen] = useState(true);
  const triggerBalancePass = useBalancePassTrigger();
  const prevPlanRailRef = useRef(planRailOpen);

  const anchorDate = useMemo(() => resolveWeekAnchorDate(breadcrumb), [breadcrumb]);
  const weekRef = useMemo(() => parseISODateString(anchorDate), [anchorDate]);

  useEffect(() => {
    if (prevPlanRailRef.current && !planRailOpen) {
      triggerBalancePass?.({
        horizon: "week",
        year: breadcrumb.year,
        month: breadcrumb.month,
        quarter: breadcrumb.quarter,
        weekStart: anchorDate,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
    }
    prevPlanRailRef.current = planRailOpen;
  }, [planRailOpen, triggerBalancePass, breadcrumb, anchorDate]);

  const { data: tasks = [] } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const weekQueryInput = useMemo(() => ({ anchorDate }), [anchorDate]);
  const { data: protectedBlocks = [] } = useQuery(
    trpc.protectedBlocks.listForWeek.queryOptions(weekQueryInput)
  );
  const { data: dayPriorities = [] } = useQuery(
    trpc.weekDayPriorities.listForWeek.queryOptions(weekQueryInput)
  );
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
      <div className="mx-auto flex max-w-[880px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlanModeToggle variant="weekPlanning" value={planRailOpen} onChange={setPlanRailOpen} />
        </div>

        <LensProvider scope="this-week">
          {hasWeekPlanData ? (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <LensControlBar />
            </div>
          ) : null}

          {planRailOpen ? (
            <WeekDraftGhosts anchorDate={anchorDate} hasInboxTasks={hasInboxTasks} />
          ) : null}

          <WeekCanvas
            anchorDate={anchorDate}
            showPlanningRail={planRailOpen}
            showWeekChrome={hasWeekPlanData}
          />
        </LensProvider>
      </div>
    </PlanProvider>
  );
}
