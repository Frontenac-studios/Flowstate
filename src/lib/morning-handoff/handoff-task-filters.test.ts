import { describe, expect, it } from "vitest";

import {
  filterAssembledTodayList,
  filterProjectTasksDueToday,
  filterRecurringDueToday,
  filterTriageCarryovers,
} from "./handoff-task-filters";

const todayIso = "2026-07-02";

describe("handoff-task-filters", () => {
  it("separates carryover, recurring, project-today, and assembled lists", () => {
    const tasks = [
      {
        id: "carry",
        title: "Yesterday",
        scheduledDate: "2026-07-01",
        bucketOverride: null,
        completedAt: null,
        projectId: null,
      },
      {
        id: "rec:abc:2026-07-02",
        title: "Weekly standup",
        scheduledDate: todayIso,
        bucketOverride: null,
        completedAt: null,
        projectId: null,
        isRecurringOccurrence: true,
        recurrenceId: "abc",
        occurrenceDate: todayIso,
      },
      {
        id: "proj",
        title: "Ship milestone",
        scheduledDate: todayIso,
        bucketOverride: null,
        completedAt: null,
        projectId: "p1",
        isRecurringOccurrence: false,
      },
      {
        id: "inbox",
        title: "Inbox capture",
        scheduledDate: null,
        bucketOverride: null,
        completedAt: null,
        projectId: null,
      },
    ];

    expect(filterTriageCarryovers(tasks, todayIso).map((t) => t.id)).toEqual(["carry"]);
    expect(filterRecurringDueToday(tasks, todayIso).map((t) => t.id)).toEqual([
      "rec:abc:2026-07-02",
    ]);
    expect(filterProjectTasksDueToday(tasks, todayIso).map((t) => t.id)).toEqual(["proj"]);
    expect(
      filterAssembledTodayList(tasks, todayIso)
        .map((t) => t.id)
        .sort()
    ).toEqual(["carry", "inbox", "proj", "rec:abc:2026-07-02"]);
  });
});
