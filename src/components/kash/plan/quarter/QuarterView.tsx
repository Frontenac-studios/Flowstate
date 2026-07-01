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
  filterGoalsByMonth,
  filterUnassignedQuarterGoals,
  monthAssignmentPayload,
  type QuarterGoalFields,
} from "@/lib/planning/quarter-goals";
import { monthsForQuarter } from "@/lib/planning/quarter-months";
import { detectQuarterNeglected } from "@/lib/planning/year-heat";
import type { ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import NeglectedCategoryCallout from "../year/NeglectedCategoryCallout";
import QuarterCategoryStrips from "../year/QuarterCategoryStrips";
import MonthColumn from "./MonthColumn";
import QuarterSpreadGhosts from "./QuarterSpreadGhosts";
import QuarterThemePicker from "./QuarterThemePicker";
import QuarterUnassignedTray from "./QuarterUnassignedTray";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

type Props = {
  year: number;
  quarter: number;
  onZoomMonth?: (month: number) => void;
};

export default function QuarterView({ year, quarter, onZoomMonth }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const tzOffsetMinutes = clientTzOffsetMinutes();

  const goalsQuery = useQuery(trpc.planning.listGoals.queryOptions({ cardYear: year }));
  const themeQuery = useQuery(
    trpc.planning.getQuarterTheme.queryOptions({ year, quarter: quarter as 1 | 2 | 3 | 4 })
  );
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

  const quarterGoals = useMemo(
    () => (goalsQuery.data ?? []) as QuarterGoalFields[],
    [goalsQuery.data]
  );

  const unassignedGoals = useMemo(
    () => filterUnassignedQuarterGoals(quarterGoals, year, quarter),
    [quarterGoals, year, quarter]
  );

  const months = useMemo(() => monthsForQuarter(quarter), [quarter]);

  const goalsByMonth = useMemo(() => {
    const map = new Map<number, QuarterGoalFields[]>();
    for (const month of months) {
      map.set(month, filterGoalsByMonth(quarterGoals, year, quarter, month));
    }
    return map;
  }, [quarterGoals, year, quarter, months]);

  const quarterData = activityQuery.data?.quarters.find((q) => q.quarter === quarter);
  const weights = quarterData?.categoryWeights;
  const neglected = weights ? detectQuarterNeglected(weights) : [];

  const focusCategories = useMemo(() => {
    const raw = themeQuery.data?.focusCategories;
    if (!Array.isArray(raw)) return [] as ProjectCategory[];
    return raw as ProjectCategory[];
  }, [themeQuery.data?.focusCategories]);

  const assignGoalToMonth = useCallback(
    (goalId: string, month: number) => {
      updateGoalMutation.mutate({
        id: goalId,
        ...monthAssignmentPayload(year, quarter, month),
      });
    },
    [updateGoalMutation, year, quarter]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string" || !overId.startsWith("month:")) return;

    const activeId = String(event.active.id);
    if (!activeId.startsWith("goal:")) return;

    const goalId = activeId.slice("goal:".length);
    const month = Number(overId.slice("month:".length));
    if (!months.includes(month)) return;

    assignGoalToMonth(goalId, month);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="mx-auto flex max-w-[880px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-ink">Q{quarter}</h2>
        </div>

        {weights ? <QuarterCategoryStrips weights={weights} /> : null}
        <NeglectedCategoryCallout categories={neglected} scope="quarter" />

        <QuarterThemePicker
          year={year}
          quarter={quarter}
          phrase={themeQuery.data?.phrase ?? null}
          focusCategories={focusCategories}
        />

        <QuarterSpreadGhosts
          year={year}
          quarter={quarter}
          hasUnassignedGoals={unassignedGoals.length > 0}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {months.map((month) => (
            <MonthColumn
              key={month}
              month={month}
              goals={goalsByMonth.get(month) ?? []}
              selectedGoalId={selectedGoalId}
              onAssignSelected={() => {
                if (selectedGoalId) assignGoalToMonth(selectedGoalId, month);
              }}
              onZoomMonth={onZoomMonth ? () => onZoomMonth(month) : undefined}
            />
          ))}
        </div>

        <QuarterUnassignedTray
          goals={unassignedGoals}
          selectedGoalId={selectedGoalId}
          onSelectGoal={setSelectedGoalId}
        />
      </div>
    </DndContext>
  );
}
