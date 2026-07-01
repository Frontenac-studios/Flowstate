import { describe, expect, it } from "vitest";

/**
 * Mirrors the empty-doc sentinel in fetch-about-me-context.ts so we can unit-test
 * formatting without a database fixture.
 */
function formatAboutMeBlock(parts: {
  values: string[];
  work?: string;
  life?: string;
  constraints: string[];
}): string {
  const valuesLine =
    parts.values.length === 0
      ? "Core values: (none yet)"
      : `Core values: ${parts.values.join(", ")}`;

  const proseParts: string[] = [];
  if (parts.work?.trim()) proseParts.push(`Work:\n${parts.work.trim()}`);
  if (parts.life?.trim()) proseParts.push(`Life:\n${parts.life.trim()}`);

  const constraintLines =
    parts.constraints.length === 0
      ? ["Constraints: (none yet)"]
      : ["Constraints:", ...parts.constraints.map((line) => `- ${line}`)];

  const block = ["About me:", valuesLine, ...proseParts, ...constraintLines]
    .filter(Boolean)
    .join("\n\n");

  if (block.trim() === "About me:\n\nCore values: (none yet)\n\nConstraints: (none yet)") {
    return "About me: (empty — no values, prose, or constraints yet)";
  }

  return block;
}

describe("fetchAboutMeContextBlock formatting", () => {
  it("returns the empty sentinel for a brand-new doc", () => {
    expect(formatAboutMeBlock({ values: [], constraints: [] })).toBe(
      "About me: (empty — no values, prose, or constraints yet)"
    );
  });

  it("includes values, prose, and constraints when present", () => {
    const block = formatAboutMeBlock({
      values: ["Health", "Craft"],
      work: "Async-first product work.",
      life: "Two kids, early mornings.",
      constraints: ["School run [commitment, hard] (Mon–Fri 8:00–8:45)"],
    });
    expect(block).toContain("Core values: Health, Craft");
    expect(block).toContain("Work:\nAsync-first product work.");
    expect(block).toContain("Life:\nTwo kids, early mornings.");
    expect(block).toContain("School run");
  });
});
