import { describe, expect, it } from "vitest";

import { resolveProjectBacklogCreateFields } from "./project-backlog-create";

describe("resolveProjectBacklogCreateFields", () => {
  it("lands tasks in backlog with no suggested date by default", () => {
    expect(resolveProjectBacklogCreateFields()).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: null,
    });
  });

  it("uses phase start date as suggested date when provided", () => {
    expect(resolveProjectBacklogCreateFields({ phaseStartDate: "2026-07-15" })).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: "2026-07-15",
    });
  });

  it("treats empty phase start date as no suggestion", () => {
    expect(resolveProjectBacklogCreateFields({ phaseStartDate: "" })).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: null,
    });
  });
});
