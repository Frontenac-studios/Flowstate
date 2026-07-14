"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { LensControlBar } from "@/components/kash/plan/LensControlBar";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanSurface } from "@/components/kash/plan/PlanSurface";
import { WeekCanvas } from "@/components/kash/plan/week/WeekCanvas";
import { WeekHeader } from "@/components/kash/plan/week/WeekHeader";
import { WeekReflectionPanel } from "@/components/kash/plan/week/WeekReflectionPanel";
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

  const { data: tasks = [] } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: protectedBlocks = [] } = useQuery(
    trpc.protectedBlocks.listForWeek.queryOptions(weekQueryInput)
  );
  const { data: dayPriorities = [] } = useQuery(
    trpc.weekDayPriorities.listForWeek.queryOptions(weekQueryInput)
  );
  const { data: triageCount } = useQuery(trpc.tasks.countTriageCandidates.queryOptions());

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

        <LensProvider scope="this-week">
          <div className="flex min-h-0 flex-1 flex-col">
            {hasWeekPlanData ? (
              <div className="mb-3 flex shrink-0 justify-end">
                <LensControlBar />
              </div>
            ) : null}
            <WeekCanvas surface="week" showWeekChrome={hasWeekPlanData} />
          </div>
        </LensProvider>
      </div>
    </PlanSurface>
  );
}
