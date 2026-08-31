import { describe, expect, it } from "vitest";

import { COACH_DOCK_SURFACES, coachThreadId, focusThreadId, threadIdSchema } from "./threads";

describe("threadIdSchema", () => {
  it("accepts global and focus threads, rejects nonsense", () => {
    expect(threadIdSchema.safeParse("global").success).toBe(true);
    expect(
      threadIdSchema.safeParse(focusThreadId("00000000-0000-4000-8000-000000000001")).success
    ).toBe(true);
    expect(threadIdSchema.safeParse("nonsense").success).toBe(false);
  });
});

describe("coach dock threads", () => {
  it("threadIdSchema accepts every coach dock surface", () => {
    for (const surface of COACH_DOCK_SURFACES) {
      expect(threadIdSchema.safeParse(coachThreadId(surface)).success).toBe(true);
    }
  });

  it("rejects unknown coach surfaces", () => {
    expect(threadIdSchema.safeParse("coach:plan").success).toBe(false);
    expect(threadIdSchema.safeParse("coach:nonsense").success).toBe(false);
    expect(threadIdSchema.safeParse("coach:").success).toBe(false);
  });
});
