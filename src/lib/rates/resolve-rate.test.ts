import { describe, expect, it } from "vitest";

import { RateNotFoundError, resolveRateCents, type CandidateRate } from "./resolve-rate";

const PROJECT = "11111111-1111-1111-1111-111111111111";
const d = (iso: string) => new Date(iso);

describe("resolveRateCents", () => {
  it("prefers a project-scoped rate over the client default", () => {
    const rates: CandidateRate[] = [
      { projectId: null, amountCents: 10000, effectiveFrom: d("2026-01-01") },
      { projectId: PROJECT, amountCents: 15000, effectiveFrom: d("2026-01-01") },
    ];
    expect(resolveRateCents(PROJECT, rates, d("2026-06-01"))).toBe(15000);
  });

  it("falls back to the client default when no project rate exists", () => {
    const rates: CandidateRate[] = [
      { projectId: null, amountCents: 10000, effectiveFrom: d("2026-01-01") },
    ];
    expect(resolveRateCents(PROJECT, rates, d("2026-06-01"))).toBe(10000);
  });

  it("throws an explicit error when nothing resolves", () => {
    expect(() => resolveRateCents(PROJECT, [], d("2026-06-01"))).toThrow(RateNotFoundError);
    expect(() => resolveRateCents(PROJECT, [])).toThrow(/No rate resolves for project/);
  });

  it("takes the most recent already-effective rate within a scope", () => {
    const rates: CandidateRate[] = [
      { projectId: PROJECT, amountCents: 15000, effectiveFrom: d("2026-01-01") },
      { projectId: PROJECT, amountCents: 18000, effectiveFrom: d("2026-04-01") },
    ];
    expect(resolveRateCents(PROJECT, rates, d("2026-06-01"))).toBe(18000);
  });

  it("ignores rates that are not yet effective", () => {
    const rates: CandidateRate[] = [
      { projectId: PROJECT, amountCents: 15000, effectiveFrom: d("2026-01-01") },
      { projectId: PROJECT, amountCents: 20000, effectiveFrom: d("2026-12-01") },
    ];
    expect(resolveRateCents(PROJECT, rates, d("2026-06-01"))).toBe(15000);
  });

  it("does not fall through to a client rate when a future project rate exists but an effective client rate also exists", () => {
    // A future-dated project rate is not yet effective, so the client default applies.
    const rates: CandidateRate[] = [
      { projectId: null, amountCents: 9000, effectiveFrom: d("2026-01-01") },
      { projectId: PROJECT, amountCents: 20000, effectiveFrom: d("2026-12-01") },
    ];
    expect(resolveRateCents(PROJECT, rates, d("2026-06-01"))).toBe(9000);
  });
});
