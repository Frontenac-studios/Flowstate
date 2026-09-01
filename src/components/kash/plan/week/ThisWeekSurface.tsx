"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { LensControlBar } from "@/components/kash/plan/LensControlBar";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanSurface } from "@/components/kash/plan/PlanSurface";
import { WeekCanvas } from "@/components/kash/plan/week/WeekCanvas";
import { WeekHeader } from "@/components/kash/plan/week/WeekHeader";
import { WeekReflectionPanel } from "@/components/kash/plan/week/WeekReflectionPanel";
import { SweepPanel } from "@/components/kash/week/SweepPanel";
import { WeekSteeringDeck } from "@/components/kash/week/WeekSteeringDeck";
import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { partitionWeekTasks } from "@/lib/week/partition-week-tasks";
import { weekHasPlanningData } from "@/lib/week/week-has-data";
import { useTRPC } from "@/trpc/client";

const DAY_MONTH: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

export function ThisWeekSurface() {
  const trpc = useTRPC();
  const localDate = useLocalCalendarDate();
  const weekRef = useMemo(() => parseISODateString(localDate), [localDate]);
  const weekDays = useMemo(() => datesInIsoWeek(weekRef), [weekRef]);
  const weekDates = useMemo(() => weekDays.map(toISODateString), [weekDays]);
  const anchorDate = weekDates[0] ?? localDate;
  const weekQueryInput = useMemo(() => ({ anchorDate }), [anchorDate]);

  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [sweepOpen, setSweepOpen] = useState(false);

  const tasksQuery = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const blocksQuery = useQuery(trpc.protectedBlocks.listForWeek.queryOptions(weekQueryInput));
  const protectedBlocks = blocksQuery.data ?? [];
  const prioritiesQuery = useQuery(trpc.weekDayPriorities.listForWeek.queryOptions(weekQueryInput));
  const dayPriorities = prioritiesQuery.data ?? [];
  const { data: triageCount } = useQuery(trpc.tasks.countTriageCandidates.queryOptions());
  const isError = tasksQuery.isError || blocksQuery.isError || prioritiesQuery.isError;

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

  const weekRange = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[weekDays.length - 1];
    if (!start || !end) return "";
    return `${start.toLocaleDateString(undefined, DAY_MONTH)} – ${end.toLocaleDateString(
      undefined,
      DAY_MONTH
    )}`;
  }, [weekDays]);

  return (
    <PlanSurface>
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <WeekHeader
          weekRange={weekRange}
          overdueCount={triageCount?.count ?? 0}
          reflectionOpen={reflectionOpen}
          onToggleReflection={() => setReflectionOpen((value) => !value)}
        />

        {reflectionOpen ? <WeekReflectionPanel /> : null}

        <WeekSteeringDeck onOpenSweep={() => setSweepOpen(true)} />
        <SweepPanel open={sweepOpen} onClose={() => setSweepOpen(false)} />

        <LensProvider scope="this-week">
          <div className="flex min-h-0 flex-1 flex-col">
            {isError ? (
              <QueryErrorNotice
                className="mb-3"
                message="This week didn't load."
                onRetry={() => {
                  void tasksQuery.refetch();
                  void blocksQuery.refetch();
                  void prioritiesQuery.refetch();
                }}
              />
            ) : null}
            {hasWeekPlanData ? (
              <div className="mb-3 flex shrink-0 justify-end">
                <LensControlBar />
              </div>
            ) : null}
            {/* The Week coach dock (SurfaceCoachLayout) now carries planning/drafting,
                so the bottom inbox rail is suppressed here to avoid two chat surfaces —
                matching the Goals-chrome "no inbox" direction. Task capture stays on the
                WeekHeader "+" composer; the day grid and Later defer column remain. */}
            <WeekCanvas surface="week" showWeekChrome={hasWeekPlanData} showPlanningRail={false} />
          </div>
        </LensProvider>
      </div>
    </PlanSurface>
  );
}
