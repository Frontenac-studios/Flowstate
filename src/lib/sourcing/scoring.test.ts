import { describe, expect, it } from "vitest";

import { buildScoringPrompt, rankLeads, type ScoringInputs } from "./scoring";
import { DEFAULT_WEIGHTS } from "./constants";

const inputs: ScoringInputs = {
  companyName: "Acme Robotics",
  companyNotes: "Series A, 18 people, hiring backend engineers.",
  segments: [{ id: "p", label: "Primary", firmographics: "seed/Series-A B2B SaaS" }],
  weights: DEFAULT_WEIGHTS,
  exclusions: ["agencies"],
  directions: ["We serve early-stage teams shipping production software."],
  wonClientNames: ["Great White", "Hume"],
  rateFloorCents: 4500,
};

describe("buildScoringPrompt", () => {
  it("encodes the hard-gate Direction, won anchors, and the company facts", () => {
    const { system, prompt } = buildScoringPrompt(inputs);
    expect(system).toContain("HARD GATE");
    expect(system).toContain("NEVER change the score");
    expect(prompt).toContain("Acme Robotics");
    expect(prompt).toContain("Series A, 18 people");
    expect(prompt).toContain("Great White, Hume");
    expect(prompt).toContain("$45/hr");
    expect(prompt).toContain("agencies");
  });

  it("degrades cleanly when nothing is configured", () => {
    const { prompt } = buildScoringPrompt({
      ...inputs,
      directions: [],
      wonClientNames: [],
      segments: [],
      exclusions: [],
      rateFloorCents: null,
      companyNotes: "",
    });
    expect(prompt).toContain("(none set)");
    expect(prompt).toContain("(no additional info provided)");
  });
});

describe("rankLeads", () => {
  it("floats verified leads up but doesn't bury a high-potential/unverified one", () => {
    const ranked = rankLeads([
      { id: "a", score: 90, confidence: 40 }, // high but unverified → adjusted 90*0.7=63
      { id: "b", score: 80, confidence: 100 }, // verified → adjusted 80
      { id: "c", score: 60, confidence: 90 }, // adjusted 60*0.95=57
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(ranked.find((r) => r.id === "a")!.highPotentialUnverified).toBe(true);
    expect(ranked.find((r) => r.id === "b")!.highPotentialUnverified).toBe(false);
  });

  it("sinks unscored leads to the bottom, stable by id", () => {
    const ranked = rankLeads([
      { id: "z", score: null, confidence: null },
      { id: "y", score: 50, confidence: 50 },
      { id: "x", score: null, confidence: null },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["y", "x", "z"]);
  });
});
