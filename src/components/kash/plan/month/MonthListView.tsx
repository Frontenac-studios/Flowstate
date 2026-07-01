"use client";

import type { MonthGoalFields } from "@/lib/planning/month-goals";
import type { ProjectCategory } from "@/lib/projects/categories";

import MonthGoalsList from "./MonthGoalsList";
import MonthIntentionsEditor from "./MonthIntentionsEditor";
import ReservedDayGhosts from "./ReservedDayGhosts";
import ReservedDaysPanel from "./ReservedDaysPanel";

type ReservedDay = {
  id: string;
  type: "outside" | "personal";
  label: string | null;
  resolvedDate: string | null;
};

type Props = {
  year: number;
  month: number;
  intentions: Array<{ category: ProjectCategory; text: string }>;
  goals: MonthGoalFields[];
  reservedDays: ReservedDay[];
};

export default function MonthListView({ year, month, intentions, goals, reservedDays }: Props) {
  const hasUnresolved = reservedDays.some((day) => !day.resolvedDate);

  return (
    <div className="flex flex-col gap-4">
      <MonthIntentionsEditor year={year} month={month} intentions={intentions} />
      <ReservedDaysPanel year={year} month={month} reservedDays={reservedDays} />
      <ReservedDayGhosts year={year} month={month} hasUnresolvedReservedDays={hasUnresolved} />
      <MonthGoalsList goals={goals} />
    </div>
  );
}
