import { addDays, datesInIsoWeek, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

export type WeekDraftTask = {
  id: string;
  title: string;
  priority: number;
};

export type WeekDraftProposal = {
  summary: string;
  assignments: { taskId: string; scheduledDate: string; rationale?: string }[];
};

/** Evenly distribute inbox tasks across remaining weekdays (Mon–Fri preferred). */
export function templateWeekDraft(
  inbox: WeekDraftTask[],
  now: Date = new Date()
): WeekDraftProposal {
  const today = startOfLocalDay(now);
  const weekDates = datesInIsoWeek(now).map(toISODateString);
  const remaining = weekDates.filter((iso) => {
    const d = new Date(iso + "T12:00:00");
    return d >= today;
  });
  const targets = remaining.length > 0 ? remaining : weekDates;

  const assignments = inbox.map((task, index) => ({
    taskId: task.id,
    scheduledDate: targets[index % targets.length]!,
    rationale: "Spread across the week",
  }));

  return {
    summary:
      "Here is a simple draft based on your inbox — tasks are spread across the remaining days this week. Adjust anything that does not fit.",
    assignments,
  };
}

/** ISO dates for last week's Mon–Sun (relative to `ref`). */
export function lastWeekDateRange(ref: Date = new Date()): { start: string; end: string } {
  const thisMonday = datesInIsoWeek(ref)[0]!;
  const lastMonday = addDays(thisMonday, -7);
  const lastSunday = addDays(lastMonday, 6);
  return {
    start: toISODateString(lastMonday),
    end: toISODateString(lastSunday),
  };
}
