import { describe, expect, it } from "vitest";

import type { EvidenceAnchor } from "@/db/schema/evidence-editions";
import type { ProjectCategory } from "@/lib/projects/categories";

import { templateEvidenceNarrative } from "./aggregate-edition-input";
import { monthPeriodForDate, quarterPeriodForDate } from "./generate-edition";
import { qualifiesGoalForEvidenceEdition } from "./maybe-trigger-milestone";

function editionInput(overrides?: {
  anchors?: EvidenceAnchor[];
  categoryCounts?: Partial<Record<ProjectCategory, number>>;
}) {
  return {
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    anchors: overrides?.anchors ?? [],
    categoryCounts: overrides?.categoryCounts ?? {},
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
        ],
        categoryCounts: { body_mind: 4 },
      })
    );
    expect(narrative.throughline).toContain("2 wins");
    expect(narrative.throughline.toLowerCase()).toContain("body");
    expect(narrative.anchors).toHaveLength(2);
  });

  it("caps anchors at forty entries", () => {
    const anchors = Array.from({ length: 50 }, (_, i) => ({
      type: "win" as const,
      id: `w-${i}`,
      label: `Win ${i}`,
    }));
    const narrative = templateEvidenceNarrative(editionInput({ anchors }));
    expect(narrative.anchors).toHaveLength(40);
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
