import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

// The guard runs in CI without `npm ci`, so it lives as a dependency-free .cjs under
// scripts/. Import its pure helpers here to test the logic (git is only touched in its
// main()). createRequire resolves the path relative to this test file.
const requireCjs = createRequire(import.meta.url);
const { isTestFile, hasRemovesTestsMarker, parseTestLosses } = requireCjs(
  "../../../scripts/pr-guards.cjs"
) as {
  isTestFile: (path: string) => boolean;
  hasRemovesTestsMarker: (prBody: string | undefined) => boolean;
  parseTestLosses: (nameStatusOutput: string) => string[];
};

describe("isTestFile", () => {
  it("matches the test globs CI runs", () => {
    expect(isTestFile("src/lib/quarter/applied-line.test.ts")).toBe(true);
    expect(isTestFile("src/components/kash/quarter/TargetCard.test.tsx")).toBe(true);
    expect(isTestFile("packages/db-local/migrate.spec.ts")).toBe(true);
    expect(isTestFile("e2e/calendar-integrations.spec.ts")).toBe(true);
  });

  it("rejects non-test files and test-like names outside the run roots", () => {
    expect(isTestFile("src/lib/quarter/applied-line.ts")).toBe(false);
    expect(isTestFile("src/components/kash/quarter/TargetCard.tsx")).toBe(false);
    expect(isTestFile("scripts/pr-guards.cjs")).toBe(false);
    // A .test.js or a test outside src/packages/e2e is not part of the run set.
    expect(isTestFile("src/lib/foo.test.js")).toBe(false);
    expect(isTestFile("docs/example.test.ts")).toBe(false);
  });
});

describe("hasRemovesTestsMarker", () => {
  it("accepts a Removes-tests line with a reason, case-insensitively", () => {
    expect(hasRemovesTestsMarker("Removes-tests: feature X is gone")).toBe(true);
    expect(hasRemovesTestsMarker("body\n\nremoves-tests: dead code\nmore")).toBe(true);
    expect(hasRemovesTestsMarker("- Removes-tests: y")).toBe(true); // list item
    expect(hasRemovesTestsMarker("> Removes-tests: y")).toBe(true); // quoted
  });

  it("rejects a missing marker, an empty reason, or the phrase mid-prose", () => {
    expect(hasRemovesTestsMarker("")).toBe(false);
    expect(hasRemovesTestsMarker(undefined as unknown as string)).toBe(false);
    expect(hasRemovesTestsMarker("just a normal description")).toBe(false);
    expect(hasRemovesTestsMarker("Removes-tests:")).toBe(false); // no reason
    expect(hasRemovesTestsMarker("this removes-tests: nothing really")).toBe(false); // mid-line
  });
});

describe("parseTestLosses", () => {
  it("flags a deleted test file", () => {
    const diff = "D\tsrc/lib/quarter/applied-line.test.ts";
    expect(parseTestLosses(diff)).toEqual(["src/lib/quarter/applied-line.test.ts"]);
  });

  it("ignores deleted source files and non-test deletions", () => {
    const diff = ["D\tsrc/lib/quarter/applied-line.ts", "D\tREADME.md"].join("\n");
    expect(parseTestLosses(diff)).toEqual([]);
  });

  it("treats a test→non-test rename as a loss but a test→test move as fine", () => {
    const away = "R100\tsrc/a.test.ts\tsrc/a.ts";
    expect(parseTestLosses(away)).toEqual(["src/a.test.ts"]);

    const move = "R100\tsrc/a.test.ts\tsrc/nested/a.test.ts";
    expect(parseTestLosses(move)).toEqual([]);
  });

  it("handles the #328 regression: both W10g test files deleted", () => {
    const diff = [
      "M\tsrc/trpc/routers/directions.ts",
      "D\tsrc/lib/quarter/applied-line.ts",
      "D\tsrc/lib/quarter/applied-line.test.ts",
      "D\tsrc/lib/week/waiting-on-you.ts",
      "D\tsrc/lib/week/waiting-on-you.test.ts",
    ].join("\n");
    expect(parseTestLosses(diff)).toEqual([
      "src/lib/quarter/applied-line.test.ts",
      "src/lib/week/waiting-on-you.test.ts",
    ]);
  });

  it("ignores empty and whitespace lines", () => {
    expect(parseTestLosses("")).toEqual([]);
    expect(parseTestLosses("\n  \n")).toEqual([]);
  });
});
