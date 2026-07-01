"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { InPageSwitcher } from "@/components/kash/InPageSwitcher";
import { filterMonthGoals } from "@/lib/planning/month-goals";
import { monthShortName } from "@/lib/planning/quarter-months";
import type { QuarterGoalFields } from "@/lib/planning/quarter-goals";
import type { ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import MonthCalendarView from "./MonthCalendarView";
import MonthGoalsList from "./MonthGoalsList";
import MonthIntentionsEditor from "./MonthIntentionsEditor";
import MonthListView from "./MonthListView";
import ReservedDayGhosts from "./ReservedDayGhosts";
import ReservedDaysPanel from "./ReservedDaysPanel";

const LAYOUT_OPTIONS = [
  { value: "list" as const, label: "List" },
  { value: "calendar" as const, label: "Calendar" },
];

type MonthLayout = (typeof LAYOUT_OPTIONS)[number]["value"];

type Props = {
  year: number;
  month: number;
};

export default function MonthView({ year, month }: Props) {
  const trpc = useTRPC();
  const [layout, setLayout] = useState<MonthLayout>("list");

  const goalsQuery = useQuery(trpc.planning.listGoals.queryOptions({ cardYear: year }));
  const intentionsQuery = useQuery(trpc.planning.listMonthIntentions.queryOptions({ year, month }));
  const reservedQuery = useQuery(trpc.planning.listReservedDays.queryOptions({ year, month }));
  const blocksQuery = useQuery(trpc.protectedBlocks.listForMonth.queryOptions({ year, month }));

  const goals = useMemo(
    () => filterMonthGoals((goalsQuery.data ?? []) as QuarterGoalFields[], year, month),
    [goalsQuery.data, year, month]
  );

  const intentions = useMemo(
    () =>
      (intentionsQuery.data ?? []).map((row) => ({
        category: row.category as ProjectCategory,
        text: row.text,
      })),
    [intentionsQuery.data]
  );

  const reservedDays = reservedQuery.data ?? [];
  const protectedBlocks = blocksQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          {monthShortName(month)} {year}
        </h2>
        <InPageSwitcher
          options={LAYOUT_OPTIONS}
          value={layout}
          onChange={setLayout}
          ariaLabel="Month layout"
        />
      </div>

      {layout === "list" ? (
        <MonthListView
          year={year}
          month={month}
          intentions={intentions}
          goals={goals}
          reservedDays={reservedDays}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <MonthIntentionsEditor year={year} month={month} intentions={intentions} />
          <MonthCalendarView
            year={year}
            month={month}
            protectedBlocks={protectedBlocks}
            reservedDays={reservedDays}
          />
          <ReservedDaysPanel year={year} month={month} reservedDays={reservedDays} />
          <ReservedDayGhosts
            year={year}
            month={month}
            hasUnresolvedReservedDays={reservedDays.some((day) => !day.resolvedDate)}
          />
          <MonthGoalsList goals={goals} />
        </div>
      )}
    </div>
  );
}
