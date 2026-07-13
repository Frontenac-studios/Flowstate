import { describe, expect, it } from "vitest";

import { shouldAutoOpenOnTriageGrowth } from "./ContextualInbox";

describe("shouldAutoOpenOnTriageGrowth", () => {
  it("seeds the baseline without opening on first count", () => {
    expect(shouldAutoOpenOnTriageGrowth(null, 4, false)).toEqual({
      shouldOpen: false,
      nextPrevious: 4,
    });
  });

  it("opens when count increases while collapsed", () => {
    expect(shouldAutoOpenOnTriageGrowth(1, 5, false)).toEqual({
      shouldOpen: true,
      nextPrevious: 5,
    });
  });

  it("does not open when count increases while already open", () => {
    expect(shouldAutoOpenOnTriageGrowth(1, 5, true)).toEqual({
      shouldOpen: false,
      nextPrevious: 5,
    });
  });

  it("does not open when count stays the same or decreases", () => {
    expect(shouldAutoOpenOnTriageGrowth(4, 4, false)).toEqual({
      shouldOpen: false,
      nextPrevious: 4,
    });
    expect(shouldAutoOpenOnTriageGrowth(4, 2, false)).toEqual({
      shouldOpen: false,
      nextPrevious: 2,
    });
  });
});
