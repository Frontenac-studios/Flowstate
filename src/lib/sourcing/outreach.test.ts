import { describe, expect, it } from "vitest";

import { buildMailto, buildOutreachPrompt, type OutreachInputs } from "./outreach";
import type { OutreachVoice } from "./types";

const VOICE: OutreachVoice = {
  warmth: "warm",
  length: "short",
  signature: "— Kat",
  citeAnalogousClient: true,
  voiceSample: "Hey — quick one.",
};

function inputs(overrides: Partial<OutreachInputs> = {}): OutreachInputs {
  return {
    companyName: "Northwind Studios",
    companyNotes: "Mid-size design agency expanding into product.",
    rationale: {
      fit: { score: 80, reasons: ["Mid-market distributor in target band"] },
      need: { score: 70, reasons: ["Hiring an ops analyst"] },
      value: { score: 40, reasons: ["WTP inferred below rate"] },
    },
    voice: VOICE,
    directions: ["Product strategy for services firms"],
    wonClientNames: ["Acme Co"],
    followUpCount: 2,
    ...overrides,
  };
}

describe("buildOutreachPrompt", () => {
  it("asks for one opener plus the requested follow-ups", () => {
    const { system } = buildOutreachPrompt(inputs({ followUpCount: 2 }));
    expect(system).toContain("one opener, then 2 follow-ups");
  });

  it("carries the Law-1 draft-only guardrail", () => {
    const { system } = buildOutreachPrompt(inputs());
    expect(system).toContain("DRAFT only");
    expect(system).toMatch(/never.*sent/i);
  });

  it("leads with the fit/need reasons, not the value (WTP) read", () => {
    const { prompt } = buildOutreachPrompt(inputs());
    expect(prompt).toContain("Mid-market distributor in target band");
    expect(prompt).toContain("Hiring an ops analyst");
    expect(prompt).not.toContain("WTP inferred below rate");
  });

  it("cites a comparable client only when the voice opts in", () => {
    const on = buildOutreachPrompt(inputs()).system;
    expect(on).toMatch(/comparable past client/i);
    const off = buildOutreachPrompt(
      inputs({ voice: { ...VOICE, citeAnalogousClient: false } })
    ).system;
    expect(off).toContain("Do not name-drop");
  });

  it("pins the signature verbatim when set, and forbids inventing one otherwise", () => {
    expect(buildOutreachPrompt(inputs()).system).toContain("— Kat");
    const noSig = buildOutreachPrompt(inputs({ voice: { ...VOICE, signature: "" } })).system;
    expect(noSig).toMatch(/Do not invent a signature/i);
  });

  it("handles an unscored lead without crashing", () => {
    const { prompt } = buildOutreachPrompt(inputs({ rationale: null }));
    expect(prompt).toContain("not scored yet");
  });
});

describe("buildMailto", () => {
  it("encodes the body with %20 (not +) and no recipient", () => {
    const href = buildMailto("Hi there, quick idea.");
    expect(href).toBe("mailto:?body=Hi%20there%2C%20quick%20idea.");
    expect(href).not.toContain("+");
  });
});
