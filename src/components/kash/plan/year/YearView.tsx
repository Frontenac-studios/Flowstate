"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useMemo, useState } from "react";

import {
  filterUnplacedGoals,
  quarterAssignmentPayload,
  type GoalHorizonFields,
} from "@/lib/planning/year-goals";
import { aggregateYearActivity } from "@/lib/planning/year-heat";
import { useTRPC } from "@/trpc/client";

import NeglectedCategoryCallout from "./NeglectedCategoryCallout";
import QuarterCard from "./QuarterCard";
import UnplacedGoalsTray from "./UnplacedGoalsTray";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

function currentCalendarQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

type Props = {
  year: number;
  onZoomQuarter: (quarter: number) => void;
};

export default function YearView({ year, onZoomQuarter }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const tzOffsetMinutes = clientTzOffsetMinutes();

  const goalsQuery = useQuery(trpc.planning.listGoals.queryOptions({ cardYear: year }));
  const themesQuery = useQuery(trpc.planning.listQuarterThemes.queryOptions({ year }));
  const activityQuery = useQuery(
    trpc.planning.getYearActivity.queryOptions({ year, tzOffsetMinutes })
  );

  const updateGoalMutation = useMutation(
    trpc.planning.updateGoal.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.planning.listGoals.pathFilter());
        setSelectedGoalId(null);
      },
    })
  );

  const unplacedGoals = useMemo(
    () => filterUnplacedGoals((goalsQuery.data ?? []) as GoalHorizonFields[], year),
    [goalsQuery.data, year]
  );

  const themeByQuarter = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const theme of themesQuery.data ?? []) {
      map.set(theme.quarter, theme.phrase);
    }
    return map;
  }, [themesQuery.data]);

  const activity = useMemo(
    () =>
      activityQuery.data ?? aggregateYearActivity({ year, completedTasks: [], timeEntries: [] }),
    [activityQuery.data, year]
  );

  const quarters = activity.quarters;
  const neglectedCategories = activity.neglectedCategories;
  const currentQuarter = year === new Date().getFullYear() ? currentCalendarQuarter() : null;

  const assignGoalToQuarter = useCallback(
    (goalId: string, quarter: number) => {
      updateGoalMutation.mutate({
        id: goalId,
        ...quarterAssignmentPayload(year, quarter),
      });
    },
    [updateGoalMutation, year]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string" || !overId.startsWith("quarter:")) return;

    const activeId = String(event.active.id);
    if (!activeId.startsWith("goal:")) return;

    const goalId = activeId.slice("goal:".length);
    const quarter = Number(overId.slice("quarter:".length));
    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) return;

    assignGoalToQuarter(goalId, quarter);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="mx-auto flex max-w-[880px] flex-col gap-4">
        <NeglectedCategoryCallout categories={neglectedCategories} scope="year" />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {quarters.map((quarter) => (
            <QuarterCard
              key={quarter.quarter}
              quarter={quarter}
              themePhrase={themeByQuarter.get(quarter.quarter) ?? null}
              isFutureQuarter={currentQuarter != null && quarter.quarter > currentQuarter}
              isDropTarget={false}
              selectedGoalId={selectedGoalId}
              onZoom={() => onZoomQuarter(quarter.quarter)}
              onAssignSelected={() => {
                if (selectedGoalId) assignGoalToQuarter(selectedGoalId, quarter.quarter);
              }}
            />
          ))}
        </div>

        <UnplacedGoalsTray
          goals={unplacedGoals}
          selectedGoalId={selectedGoalId}
          onSelectGoal={setSelectedGoalId}
        />
      </div>
    </DndContext>
  );
}
