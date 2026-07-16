import { describe, expect, it } from "vitest";

import {
  collectProjectMorningSuggestions,
  filterAssembledTodayList,
  filterInboxUnscheduled,
  filterLookbackCarryovers,
  filterProjectTasksDueToday,
  filterRecurringDueToday,
  filterTriageCarryovers,
  paceSuggestions,
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

  it("limits carryovers to the lookback window", () => {
    const tasks = [
      {
        id: "recent",
        title: "Two days ago",
        scheduledDate: "2026-06-30",
        bucketOverride: null,
        completedAt: null,
        projectId: null,
      },
      {
        id: "stale",
        title: "Too old",
        scheduledDate: "2026-06-27",
        bucketOverride: null,
        completedAt: null,
        projectId: null,
      },
    ];

    expect(filterLookbackCarryovers(tasks, todayIso).map((t) => t.id)).toEqual(["recent"]);
    expect(filterTriageCarryovers(tasks, todayIso).map((t) => t.id)).toEqual(["recent", "stale"]);
  });

  it("collects unscheduled inbox items", () => {
    const tasks = [
      {
        id: "inbox",
        title: "Capture",
        scheduledDate: null,
        bucketOverride: null,
        completedAt: null,
        projectId: null,
      },
      {
        id: "later",
        title: "Shelved",
        scheduledDate: null,
        bucketOverride: "later",
        completedAt: null,
        projectId: null,
      },
      {
        id: "scheduled",
        title: "Due today",
        scheduledDate: todayIso,
        bucketOverride: null,
        completedAt: null,
        projectId: null,
      },
    ];

    expect(filterInboxUnscheduled(tasks).map((t) => t.id)).toEqual(["inbox"]);
  });

  it("ranks project morning suggestions and paces batches", () => {
    const tasks = [
      {
        id: "due",
        title: "Due today",
        scheduledDate: todayIso,
        bucketOverride: null,
        completedAt: null,
        projectId: "p1",
        isRecurringOccurrence: false,
      },
      {
        id: "overdue",
        title: "Overdue",
        scheduledDate: "2026-07-01",
        bucketOverride: null,
        completedAt: null,
        projectId: "p1",
        isRecurringOccurrence: false,
      },
      {
        id: "light",
        title: "Unscheduled project task",
        scheduledDate: null,
        bucketOverride: null,
        completedAt: null,
        projectId: "p1",
        isRecurringOccurrence: false,
      },
    ];

    expect(collectProjectMorningSuggestions(tasks, todayIso).map((row) => row.task.id)).toEqual([
      "due",
      "overdue",
      "light",
    ]);

    const suggestions = collectProjectMorningSuggestions(
      Array.from({ length: 7 }, (_, index) => ({
        id: `p${index}`,
        title: `Task ${index}`,
        scheduledDate: null,
        bucketOverride: null,
        completedAt: null,
        projectId: "p1",
        isRecurringOccurrence: false,
      })),
      todayIso
    );

    const first = paceSuggestions(suggestions, { batch: 5 });
    expect(first.batch).toHaveLength(5);
    expect(first.hasMore).toBe(true);
    expect(first.nextOffset).toBe(5);

    const second = paceSuggestions(suggestions, { offset: first.nextOffset, batch: 5 });
    expect(second.batch).toHaveLength(2);
    expect(second.hasMore).toBe(false);
  });
});
