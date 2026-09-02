import { describe, expect, it } from "vitest";

import { computeBudgetBar } from "@/lib/budget/compute-budget-bar";

import { ledgerCopy } from "./ledger-copy";

const HOUR = 3600;
const bar = (businessSeconds: number, personalSeconds: number, tilt: number | null) =>
  computeBudgetBar({ businessSeconds, personalSeconds, tiltBusinessPct: tilt });

describe("ledgerCopy", () => {
  it("states the said-vs-spent line", () => {
    const copy = ledgerCopy({
      bar: bar(41 * HOUR, 59 * HOUR, 70),
      isCurrentQuarter: true,
      source: "sealed",
      quarterLabel: "Q3 2026",
    });
    expect(copy.headline).toBe("You said 70% business. You spent 41%.");
    expect(copy.note).toBeNull();
  });

  it("says nothing was logged, without inventing a percentage", () => {
    const copy = ledgerCopy({
      bar: bar(0, 0, 70),
      isCurrentQuarter: true,
      source: "live",
      quarterLabel: "Q3 2026",
    });
    expect(copy.headline).toBe("You said 70% business. Nothing was logged in this fortnight.");
  });

  it("still reports the spend when no tilt was ever declared", () => {
    const copy = ledgerCopy({
      bar: bar(41 * HOUR, 59 * HOUR, null),
      isCurrentQuarter: true,
      source: "live",
      quarterLabel: "Q3 2026",
    });
    expect(copy.headline).toBe("You spent 41% of this fortnight on business.");
    expect(copy.note).toBe("No tilt declared for the quarter yet.");
  });

  it("flags a live read of an earlier quarter as held against today's declaration", () => {
    const copy = ledgerCopy({
      bar: bar(41 * HOUR, 59 * HOUR, 70),
      isCurrentQuarter: false,
      source: "live",
      quarterLabel: "Q2 2026",
    });
    expect(copy.note).toBe(
      "Held against your current declaration of 70% — Q2 2026's tilt isn't on record."
    );
  });

  it("adds no caveat to a sealed fortnight — its tilt is the one that was declared", () => {
    const copy = ledgerCopy({
      bar: bar(41 * HOUR, 59 * HOUR, 70),
      isCurrentQuarter: false,
      source: "sealed",
      quarterLabel: "Q2 2026",
    });
    expect(copy.note).toBeNull();
  });

  it("never grades the result — no verdict words in any state", () => {
    // Law 3: the Ledger states, it does not warn.
    const forbidden = /behind|off track|warning|should|failed|bad|poor|only/i;
    for (const b of [bar(41 * HOUR, 59 * HOUR, 70), bar(0, 0, 70), bar(90 * HOUR, 10 * HOUR, 70)]) {
      const copy = ledgerCopy({
        bar: b,
        isCurrentQuarter: true,
        source: "live",
        quarterLabel: "Q3 2026",
      });
      expect(copy.headline).not.toMatch(forbidden);
      expect(copy.note ?? "").not.toMatch(forbidden);
    }
  });
});
