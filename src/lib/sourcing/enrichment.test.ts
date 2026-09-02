import { describe, expect, it } from "vitest";

import {
  applyEnrichment,
  buildGapFillPrompt,
  CHRONIC_MIN_SAMPLE,
  segmentConfidenceHealth,
  shouldEnrich,
  type EnrichmentPatch,
} from "./enrichment";
import type { CompanyFacts } from "./research";

const facts = (over: Partial<CompanyFacts> = {}): CompanyFacts => ({
  summary: "Northwind moves freight.",
  industry: null,
  sizeBand: null,
  location: "Chicago",
  signals: ["Hiring backend engineers"],
  techStack: ["Rails"],
  unverified: ["Employee count", "Annual revenue"],
  sources: [{ title: "Careers", url: "https://n.example/careers" }],
  ...over,
});

const patch = (over: Partial<EnrichmentPatch> = {}): EnrichmentPatch => ({
  industry: null,
  sizeBand: null,
  location: null,
  signals: [],
  techStack: [],
  resolved: [],
  stillUnverified: [],
  sources: [],
  ...over,
});

describe("buildGapFillPrompt", () => {
  it("aims at the named gaps, not the company in general", () => {
    const { prompt } = buildGapFillPrompt({
      companyName: "Northwind",
      facts: facts(),
      gaps: ["Employee count", "Annual revenue"],
    });
    expect(prompt).toContain("Could not be confirmed");
    expect(prompt).toContain("- Employee count");
    expect(prompt).toContain("- Annual revenue");
  });

  it("tells the model that 'still unknown' is a correct answer", () => {
    const { system } = buildGapFillPrompt({ companyName: "N", facts: facts(), gaps: ["x"] });
    expect(system).toMatch(/never resolve a gap with a guess/i);
    expect(system).toMatch(/correct and useful answer/i);
  });
});

describe("applyEnrichment", () => {
  it("fills a field research left null", () => {
    const out = applyEnrichment(facts(), patch({ industry: "Logistics", sizeBand: "~40 staff" }));
    expect(out.industry).toBe("Logistics");
    expect(out.sizeBand).toBe("~40 staff");
  });

  it("never overwrites a field research already established", () => {
    const out = applyEnrichment(facts({ location: "Chicago" }), patch({ location: "Detroit" }));
    expect(out.location).toBe("Chicago");
  });

  it("drops a gap it genuinely resolved", () => {
    const out = applyEnrichment(facts(), patch({ resolved: ["Employee count"] }));
    expect(out.unverified).toEqual(["Annual revenue"]);
  });

  it("ignores a 'resolved' gap nobody ever asked about", () => {
    // A model shrinking the unknown list by inventing entries for it would make the
    // company look better understood than it is, which is the one thing confidence
    // exists to prevent.
    const out = applyEnrichment(facts(), patch({ resolved: ["Founder's dog's name"] }));
    expect(out.unverified).toEqual(["Employee count", "Annual revenue"]);
  });

  it("matches a resolved gap regardless of case and padding", () => {
    const out = applyEnrichment(facts(), patch({ resolved: ["  employee COUNT "] }));
    expect(out.unverified).toEqual(["Annual revenue"]);
  });

  it("adds newly discovered unknowns without duplicating existing ones", () => {
    const out = applyEnrichment(
      facts(),
      patch({ stillUnverified: ["Annual revenue", "Funding stage"] })
    );
    expect(out.unverified).toEqual(["Employee count", "Annual revenue", "Funding stage"]);
  });

  it("merges signals and stack without duplicates", () => {
    const out = applyEnrichment(
      facts(),
      patch({ signals: ["Hiring backend engineers", "Opened a depot"], techStack: ["Rails"] })
    );
    expect(out.signals).toEqual(["Hiring backend engineers", "Opened a depot"]);
    expect(out.techStack).toEqual(["Rails"]);
  });

  it("appends its sources so the extra claims stay auditable", () => {
    const out = applyEnrichment(
      facts(),
      patch({ sources: [{ title: "Crunchbase", url: "https://cb.example/n" }] })
    );
    expect(out.sources.map((s) => s.url)).toEqual([
      "https://n.example/careers",
      "https://cb.example/n",
    ]);
  });
});

describe("segmentConfidenceHealth", () => {
  const many = (segment: string, confidence: number, n: number) =>
    Array.from({ length: n }, () => ({ segment, confidence }));

  it("flags a segment that is consistently low-confidence", () => {
    const health = segmentConfidenceHealth(many("s1", 40, CHRONIC_MIN_SAMPLE));
    expect(health[0]).toMatchObject({ segmentId: "s1", meanConfidence: 40, chronicallyLow: true });
  });

  it("will not flag on a small sample, however bad it looks", () => {
    const health = segmentConfidenceHealth(many("s1", 10, CHRONIC_MIN_SAMPLE - 1));
    expect(health[0].chronicallyLow).toBe(false);
  });

  it("leaves a healthy segment alone", () => {
    const health = segmentConfidenceHealth(many("s1", 80, 20));
    expect(health[0].chronicallyLow).toBe(false);
  });

  it("ignores unscored leads and unsegmented ones", () => {
    const health = segmentConfidenceHealth([
      { segment: "s1", confidence: null },
      { segment: null, confidence: 10 },
      ...many("s1", 90, 5),
    ]);
    expect(health).toHaveLength(1);
    expect(health[0].scored).toBe(5);
  });

  it("sorts the worst segment first — that is the one a vendor would serve", () => {
    const health = segmentConfidenceHealth([...many("good", 90, 5), ...many("bad", 30, 5)]);
    expect(health.map((h) => h.segmentId)).toEqual(["bad", "good"]);
  });
});

describe("shouldEnrich", () => {
  it("does nothing when the segment has enrichment off", () => {
    expect(shouldEnrich({ mode: "off", confidence: 20, gaps: ["x"] })).toBe(false);
    expect(shouldEnrich({ mode: undefined, confidence: 20, gaps: ["x"] })).toBe(false);
  });

  it("skips a company with nothing left to find out", () => {
    expect(shouldEnrich({ mode: "web", confidence: 20, gaps: [] })).toBe(false);
  });

  it("skips a company already well understood", () => {
    expect(shouldEnrich({ mode: "web", confidence: 90, gaps: ["x"] })).toBe(false);
  });

  it("enriches a low-confidence company with named gaps", () => {
    expect(shouldEnrich({ mode: "web", confidence: 30, gaps: ["x"] })).toBe(true);
  });

  it("skips an unscored lead — there is no confidence to act on yet", () => {
    expect(shouldEnrich({ mode: "web", confidence: null, gaps: ["x"] })).toBe(false);
  });
});
