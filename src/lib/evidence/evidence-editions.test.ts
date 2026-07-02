import { describe, expect, it } from "vitest";

import type { EvidenceAnchor } from "@/db/schema/evidence-editions";

import { monthPeriodForDate, quarterPeriodForDate } from "./evidence-periods";
import { qualifiesGoalForEvidenceEdition } from "./qualifies-goal-for-evidence";
import {
  applyEditionGuardrails,
  templateEvidenceNarrative,
  type EditionInput,
} from "./template-evidence-narrative";

function editionInput(overrides?: Partial<EditionInput>): EditionInput {
  return {
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    anchors: [],
    categoryCounts: {},
    ...overrides,
  };
}

describe("quarterPeriodForDate", () => {
  it("returns Q1 bounds for a January date", () => {
    expect(quarterPeriodForDate("2026-01-15")).toEqual({
      start: "2026-01-01",
      end: "2026-03-31",
    });
  });

  it("returns Q4 bounds for a December date", () => {
    expect(quarterPeriodForDate("2026-12-01")).toEqual({
      start: "2026-10-01",
      end: "2026-12-31",
    });
  });
});

describe("monthPeriodForDate", () => {
  it("returns the full month for a mid-month date", () => {
    expect(monthPeriodForDate("2026-07-15")).toEqual({
      start: "2026-07-01",
      end: "2026-07-31",
    });
  });
});

describe("templateEvidenceNarrative", () => {
  it("stays honest on a quiet window", () => {
    const narrative = templateEvidenceNarrative(editionInput());
    expect(narrative.throughline).toContain("quieter stretch");
    expect(narrative.anchors).toHaveLength(0);
  });

  it("names wins in the user's own words", () => {
    const narrative = templateEvidenceNarrative(
      editionInput({
        anchors: [
          { type: "win", id: "w1", label: "Shipped the deck" },
          { type: "win", id: "w2", label: "Made dinner" },
          { type: "win", id: "w3", label: "Walked outside" },
        ],
        categoryCounts: { body_mind: 4 },
      })
    );
    expect(narrative.throughline).toContain("3 wins");
    expect(narrative.throughline.toLowerCase()).toContain("body");
    expect(narrative.anchors).toHaveLength(3);
  });

  it("caps anchors at forty entries", () => {
    const anchors: EvidenceAnchor[] = Array.from({ length: 50 }, (_, i) => ({
      type: "win",
      id: `w-${i}`,
      label: `Win ${i}`,
    }));
    const narrative = templateEvidenceNarrative(editionInput({ anchors }));
    expect(narrative.anchors).toHaveLength(40);
  });

  it("keeps thin windows short (C2)", () => {
    const narrative = templateEvidenceNarrative(
      editionInput({
        anchors: [{ type: "win", id: "w1", label: "Walked outside" }],
        categoryCounts: { body_mind: 2, professional: 5 },
      })
    );
    expect(narrative.throughline.split(".").filter(Boolean)).toHaveLength(1);
  });

  it("applyEditionGuardrails caps throughline length", () => {
    const long = "A".repeat(300);
    const guarded = applyEditionGuardrails(
      { throughline: long, anchors: [] },
      { winCount: 5, reflectionCount: 0 }
    );
    expect(guarded.throughline.length).toBeLessThanOrEqual(220);
  });
});

describe("qualifiesGoalForEvidenceEdition", () => {
  it("fires for quarter-horizon goals", () => {
    expect(qualifiesGoalForEvidenceEdition("quarter", 0)).toBe(true);
    expect(qualifiesGoalForEvidenceEdition("year", 1)).toBe(true);
  });

  it("fires when a goal has three or more milestones", () => {
    expect(qualifiesGoalForEvidenceEdition("month", 3)).toBe(true);
  });

  it("stays quiet for small month goals", () => {
    expect(qualifiesGoalForEvidenceEdition("month", 2)).toBe(false);
    expect(qualifiesGoalForEvidenceEdition(null, 1)).toBe(false);
  });
});
