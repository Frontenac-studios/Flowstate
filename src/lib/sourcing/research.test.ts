import { describe, expect, it } from "vitest";

import {
  buildDistillPrompt,
  buildResearchPrompt,
  companyFactsSchema,
  FACT_LIMITS,
  factsAreEmpty,
  mergeSources,
  normalizeCompanyFacts,
  renderFactsForScoring,
  WEB_MAX_RESULTS,
  type CompanyFacts,
} from "./research";

const facts = (over: Partial<CompanyFacts> = {}): CompanyFacts => ({
  summary: "Northwind Traders moves freight for mid-market retailers across the Midwest.",
  industry: "Logistics",
  sizeBand: "~40 staff",
  location: "Chicago, IL",
  signals: ["Hiring two backend engineers", "Raised a Series A in June"],
  techStack: ["Rails monolith", "no in-house mobile team"],
  unverified: ["Annual revenue"],
  sources: [{ title: "Careers", url: "https://northwind.example/careers" }],
  ...over,
});

describe("buildResearchPrompt", () => {
  it("names the ICP segments so the search chases facts that matter", () => {
    const { prompt } = buildResearchPrompt({
      companyName: "Northwind Traders",
      companyNotes: "",
      segments: [{ id: "s1", label: "Logistics SaaS", firmographics: "20-200 staff, US" }],
    });
    expect(prompt).toContain("Logistics SaaS");
    expect(prompt).toContain("20-200 staff, US");
  });

  it("never tells the model what a good answer looks like", () => {
    const { system, prompt } = buildResearchPrompt({
      companyName: "Northwind Traders",
      companyNotes: "",
      segments: [{ id: "s1", label: "Logistics SaaS", firmographics: "20-200 staff" }],
    });
    // Scoring language must not leak into research, or it finds what it's asked for.
    expect(`${system}\n${prompt}`).not.toMatch(/\bscore\b/i);
    expect(system).toMatch(/never infer/i);
  });

  it("asks the model to verify rather than parrot what is already known", () => {
    const { prompt } = buildResearchPrompt({
      companyName: "Northwind Traders",
      companyNotes: "Mid-size logistics, 40 staff",
      segments: [],
    });
    expect(prompt).toContain("verify, don't repeat");
    expect(prompt).toContain("Mid-size logistics, 40 staff");
  });

  it("copes with no segments configured", () => {
    const { prompt } = buildResearchPrompt({
      companyName: "Northwind Traders",
      companyNotes: "",
      segments: [],
    });
    expect(prompt).toContain("no segments configured");
  });
});

describe("buildDistillPrompt", () => {
  it("confines the model to the write-up", () => {
    const { system, prompt } = buildDistillPrompt({
      companyName: "Northwind Traders",
      research: "They move freight.",
    });
    expect(system).toMatch(/do not add knowledge of your own/i);
    expect(prompt).toContain("They move freight.");
  });

  it("lists the consulted sources so URLs are attributed, never recalled", () => {
    const { system, prompt } = buildDistillPrompt({
      companyName: "Northwind Traders",
      research: "They move freight.",
      sources: [{ title: "Careers", url: "https://n.example/careers" }],
    });
    expect(prompt).toContain("# Sources consulted");
    expect(prompt).toContain("https://n.example/careers");
    expect(system).toMatch(/never write a url from memory/i);
  });

  it("omits the sources section when the vendor reported none", () => {
    const { prompt } = buildDistillPrompt({
      companyName: "Northwind Traders",
      research: "They move freight.",
      sources: [],
    });
    expect(prompt).not.toContain("# Sources consulted");
  });
});

describe("mergeSources", () => {
  it("puts the vendor's citations ahead of anything the model transcribed", () => {
    const merged = mergeSources(
      [{ title: "Vendor", url: "https://v.example" }],
      [{ title: "Model", url: "https://m.example" }]
    );
    expect(merged.map((s) => s.url)).toEqual(["https://v.example", "https://m.example"]);
  });

  it("lets the cap drop the model's guesses first", () => {
    const vendor = Array.from({ length: 12 }, (_, i) => ({
      title: "v",
      url: `https://v.example/${i}`,
    }));
    const extracted = [{ title: "invented", url: "https://hallucinated.example" }];
    const out = normalizeCompanyFacts(facts({ sources: mergeSources(vendor, extracted) }));
    expect(out.sources).toHaveLength(12);
    expect(out.sources.map((s) => s.url)).not.toContain("https://hallucinated.example");
  });
});

describe("companyFactsSchema", () => {
  it("accepts nulls for everything the web may not confirm", () => {
    const parsed = companyFactsSchema.safeParse({
      summary: "A company.",
      industry: null,
      sizeBand: null,
      location: null,
      signals: [],
      techStack: [],
      unverified: ["Everything"],
      sources: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing summary rather than inventing one", () => {
    expect(companyFactsSchema.safeParse({ industry: "Logistics" }).success).toBe(false);
  });

  it("does NOT cap sizes — an overlong field must not throw the whole result away", () => {
    // Regression: the first cut had .max() on every field and lost a paid-for research
    // call because the summary ran a little long. Size is clamped after parsing.
    const parsed = companyFactsSchema.safeParse({
      summary: "x".repeat(5000),
      industry: "y".repeat(500),
      sizeBand: null,
      location: null,
      signals: Array.from({ length: 40 }, (_, i) => `signal ${i}`),
      techStack: [],
      unverified: [],
      sources: Array.from({ length: 40 }, (_, i) => ({
        title: "t",
        url: `https://e.example/${i}`,
      })),
    });
    expect(parsed.success).toBe(true);
  });
});

describe("normalizeCompanyFacts", () => {
  it("truncates an overlong summary instead of failing", () => {
    const out = normalizeCompanyFacts(facts({ summary: "x".repeat(5000) }));
    expect(out.summary).toHaveLength(FACT_LIMITS.summary);
    expect(out.summary.endsWith("…")).toBe(true);
  });

  it("caps list lengths", () => {
    const out = normalizeCompanyFacts(
      facts({
        signals: Array.from({ length: 40 }, (_, i) => `signal ${i}`),
        sources: Array.from({ length: 40 }, (_, i) => ({
          title: "t",
          url: `https://e.example/${i}`,
        })),
      })
    );
    expect(out.signals).toHaveLength(FACT_LIMITS.signals);
    expect(out.sources).toHaveLength(FACT_LIMITS.sources);
  });

  it("de-duplicates sources by url so one page can't crowd out the rest", () => {
    const out = normalizeCompanyFacts(
      facts({
        sources: [
          { title: "Careers", url: "https://n.example/careers" },
          { title: "Careers again", url: "https://n.example/careers" },
          { title: "Blog", url: "https://n.example/blog" },
        ],
      })
    );
    expect(out.sources.map((s) => s.url)).toEqual([
      "https://n.example/careers",
      "https://n.example/blog",
    ]);
  });

  it("turns a blank string into a null rather than an empty field", () => {
    const out = normalizeCompanyFacts(facts({ industry: "   ", sizeBand: "" }));
    expect(out.industry).toBeNull();
    expect(out.sizeBand).toBeNull();
  });

  it("drops empty list entries", () => {
    const out = normalizeCompanyFacts(facts({ signals: ["real", "  ", ""] }));
    expect(out.signals).toEqual(["real"]);
  });

  it("never throws, whatever the model returned", () => {
    expect(() =>
      normalizeCompanyFacts({
        summary: "",
        industry: null,
        sizeBand: null,
        location: null,
        signals: [],
        techStack: [],
        unverified: [],
        sources: [{ title: "", url: "x".repeat(3000) }],
      })
    ).not.toThrow();
  });
});

describe("renderFactsForScoring", () => {
  it("renders every populated field", () => {
    const rendered = renderFactsForScoring(facts());
    expect(rendered).toContain("moves freight");
    expect(rendered).toContain("Industry: Logistics");
    expect(rendered).toContain("Size/stage: ~40 staff");
    expect(rendered).toContain("Hiring two backend engineers");
    expect(rendered).toContain("Rails monolith");
  });

  it("carries the unconfirmed list through so it can become a scoring gap", () => {
    expect(renderFactsForScoring(facts())).toContain("Could not be confirmed: Annual revenue");
  });

  it("omits empty fields instead of writing 'null'", () => {
    const rendered = renderFactsForScoring(
      facts({ industry: null, sizeBand: null, location: null, signals: [], techStack: [] })
    );
    expect(rendered).not.toMatch(/null/);
    expect(rendered).not.toContain("Industry:");
    expect(rendered).not.toContain("Signals:");
  });

  it("includes source urls so the score can be audited", () => {
    expect(renderFactsForScoring(facts())).toContain("https://northwind.example/careers");
  });
});

describe("factsAreEmpty", () => {
  it("is true when research found nothing a score could stand on", () => {
    expect(
      factsAreEmpty(
        facts({
          summary: "",
          industry: null,
          sizeBand: null,
          signals: [],
          techStack: [],
        })
      )
    ).toBe(true);
  });

  it("is false as soon as anything was confirmed", () => {
    expect(factsAreEmpty(facts({ summary: "", industry: "Logistics", signals: [] }))).toBe(false);
  });
});

describe("cost cap", () => {
  it("caps billed results per research call", () => {
    expect(WEB_MAX_RESULTS).toBeLessThanOrEqual(5);
  });
});
