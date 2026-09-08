import { describe, expect, it } from "vitest";

import { formatAppliedLine } from "./applied-line";

describe("formatAppliedLine", () => {
  it("reads as the discovery example", () => {
    expect(formatAppliedLine({ scored: 14, declined: 9 })).toBe(
      "Scored 14 leads this quarter · 9 declined on this basis · feeds the Filter."
    );
  });

  it("states a true zero rather than dressing it up", () => {
    expect(formatAppliedLine({ scored: 0, declined: 0 })).toBe(
      "No leads scored against this yet this quarter."
    );
  });

  it("drops the declined clause when nothing was declined", () => {
    expect(formatAppliedLine({ scored: 3, declined: 0 })).toBe(
      "Scored 3 leads this quarter · feeds the Filter."
    );
  });

  it("says lead, singular, for one", () => {
    expect(formatAppliedLine({ scored: 1, declined: 0 })).toBe(
      "Scored 1 lead this quarter · feeds the Filter."
    );
  });

  it("never emits a rate — a Direction has no target to imply", () => {
    const line = formatAppliedLine({ scored: 10, declined: 5 });
    expect(line).not.toMatch(/%/);
    expect(line).not.toMatch(/rate/i);
  });
});
