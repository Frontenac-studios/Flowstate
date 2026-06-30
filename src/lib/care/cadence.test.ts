import { rrulestr } from "rrule";
import { describe, expect, it } from "vitest";

import { cadenceToRRule } from "./cadence";

describe("cadenceToRRule", () => {
  it("maps each cadence to the expected stored RRULE text", () => {
    expect(cadenceToRRule("daily")).toBe("FREQ=DAILY");
    expect(cadenceToRRule("weekly")).toBe("FREQ=WEEKLY");
    expect(cadenceToRRule("most_days")).toBe("FREQ=DAILY"); // soft → plain daily default
    expect(cadenceToRRule("when_needed")).toBeNull();
  });

  it("returns null when no cadence is set", () => {
    expect(cadenceToRRule(null)).toBeNull();
    expect(cadenceToRRule(undefined)).toBeNull();
  });

  it("emits text WITHOUT the RRULE: prefix", () => {
    expect(cadenceToRRule("daily")).not.toContain("RRULE:");
  });

  it("produces text that round-trips through the recurrence engine", () => {
    for (const cadence of ["daily", "weekly", "most_days"] as const) {
      const rule = cadenceToRRule(cadence);
      expect(rule).not.toBeNull();
      // Mirrors expand.ts: the engine re-adds the prefix before parsing.
      expect(() => rrulestr(`RRULE:${rule}`)).not.toThrow();
    }
  });
});
