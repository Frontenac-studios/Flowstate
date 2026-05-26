import { describe, expect, it } from "vitest";

import { filterTriageCandidates, isTriageCandidate } from "./triage-candidates";

const todayIso = "2026-05-26";

describe("isTriageCandidate", () => {
  it("returns true for incomplete task scheduled before today", () => {
    expect(
      isTriageCandidate(
        { scheduledDate: "2026-05-25", bucketOverride: null, completedAt: null },
        todayIso
      )
    ).toBe(true);
  });

  it("returns false for task scheduled today", () => {
    expect(
      isTriageCandidate(
        { scheduledDate: todayIso, bucketOverride: null, completedAt: null },
        todayIso
      )
    ).toBe(false);
  });

  it("returns false for unscheduled captures", () => {
    expect(
      isTriageCandidate({ scheduledDate: null, bucketOverride: null, completedAt: null }, todayIso)
    ).toBe(false);
  });

  it("returns false for Later bucket override", () => {
    expect(
      isTriageCandidate(
        { scheduledDate: "2026-05-20", bucketOverride: "later", completedAt: null },
        todayIso
      )
    ).toBe(false);
  });

  it("returns false when completed", () => {
    expect(
      isTriageCandidate(
        {
          scheduledDate: "2026-05-25",
          bucketOverride: null,
          completedAt: new Date(),
        },
        todayIso
      )
    ).toBe(false);
  });
});

describe("filterTriageCandidates", () => {
  it("filters a mixed list", () => {
    const tasks = [
      { id: "a", scheduledDate: "2026-05-25", bucketOverride: null, completedAt: null },
      { id: "b", scheduledDate: todayIso, bucketOverride: null, completedAt: null },
      { id: "c", scheduledDate: null, bucketOverride: null, completedAt: null },
    ];

    const result = filterTriageCandidates(tasks, todayIso);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });
});
