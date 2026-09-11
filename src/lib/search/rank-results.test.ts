import { describe, expect, it } from "vitest";

import { normalizeQuery, rankResults, type RankableResult } from "./rank-results";

const day = (n: number) => new Date(2026, 8, n);

const row = (over: Partial<RankableResult> & { id: string; title: string }): RankableResult => ({
  kind: "task",
  matchField: "title",
  done: false,
  updatedAt: day(1),
  snippet: null,
  ...over,
});

describe("rankResults", () => {
  it("puts a title match above a note match", () => {
    const results = rankResults(
      [
        row({ id: "note", title: "Call the studio", matchField: "body" }),
        row({ id: "title", title: "Invoice Great White" }),
      ],
      "invoice"
    );
    expect(results.map((r) => r.id)).toEqual(["title", "note"]);
  });

  it("prefers a title that starts with the query", () => {
    const results = rankResults(
      [
        row({ id: "contains", title: "Send the invoice to Dani" }),
        row({ id: "prefix", title: "Invoice Great White for March" }),
      ],
      "invoice"
    );
    expect(results.map((r) => r.id)).toEqual(["prefix", "contains"]);
  });

  it("ranks a word-start match above a mid-word one", () => {
    const results = rankResults(
      [
        row({ id: "midword", title: "Reinvoice the deposit" }),
        row({ id: "wordstart", title: "Send the invoice to Dani" }),
      ],
      "invoice"
    );
    expect(results.map((r) => r.id)).toEqual(["wordstart", "midword"]);
  });

  it("never lets a completed task outrank an open one at the same match quality", () => {
    const results = rankResults(
      [
        row({ id: "done", title: "Invoice Great White", done: true, updatedAt: day(20) }),
        row({ id: "open", title: "Invoice Great White", updatedAt: day(2) }),
      ],
      "invoice"
    );
    expect(results.map((r) => r.id)).toEqual(["open", "done"]);
  });

  it("keeps completed work findable rather than hiding it", () => {
    const results = rankResults(
      [row({ id: "done", title: "Invoice Hume", done: true })],
      "invoice"
    );
    expect(results.map((r) => r.id)).toEqual(["done"]);
  });

  it("breaks ties on recency, then on title, so the order never reshuffles", () => {
    const results = rankResults(
      [
        row({ id: "older", title: "Invoice A", updatedAt: day(1) }),
        row({ id: "newer", title: "Invoice B", updatedAt: day(9) }),
      ],
      "invoice"
    );
    expect(results.map((r) => r.id)).toEqual(["newer", "older"]);
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(rankResults([row({ id: "a", title: "Invoice" })], "   ")).toEqual([]);
  });

  it("cuts to the limit after ordering, not before", () => {
    const results = rankResults(
      [
        row({ id: "body", title: "Something else", matchField: "body" }),
        row({ id: "title", title: "Invoice Great White" }),
      ],
      "invoice",
      1
    );
    expect(results.map((r) => r.id)).toEqual(["title"]);
  });
});

describe("normalizeQuery", () => {
  it("folds case and collapses whitespace", () => {
    expect(normalizeQuery("  Great   WHITE ")).toBe("great white");
  });
});
