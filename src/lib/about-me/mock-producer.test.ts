import { describe, expect, it } from "vitest";

import { mockCheckInAboutMeProposals, mockEodReflectionAboutMeProposals } from "./mock-producer";

describe("mockCheckInAboutMeProposals", () => {
  it("proposes work prose from active goals for the year", () => {
    const proposals = mockCheckInAboutMeProposals(
      "quarter",
      "2026-Q2",
      [
        { title: "Ship v1", state: "active", targetYear: 2026 },
        { title: "Old idea", state: "active", targetYear: 2025 },
      ],
      2026
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      targetSection: "work",
      sourceText: "planning check-in · 2026-Q2",
    });
    expect((proposals[0]?.payload as { text: string }).text).toContain("Ship v1");
    expect((proposals[0]?.payload as { text: string }).text).toContain("this quarter");
  });

  it("returns empty when no active goals for the year", () => {
    expect(
      mockCheckInAboutMeProposals(
        "week",
        "2026-W26",
        [{ title: "X", state: "paused", targetYear: 2026 }],
        2026
      )
    ).toEqual([]);
  });
});

describe("mockEodReflectionAboutMeProposals", () => {
  it("skips short reflection", () => {
    expect(mockEodReflectionAboutMeProposals("2026-06-29", "short")).toEqual([]);
  });

  it("captures life prose from longer reflection", () => {
    const text = "Today felt scattered but I made peace with saying no to one meeting.";
    const proposals = mockEodReflectionAboutMeProposals("2026-06-29", text);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      targetSection: "life",
      sourceText: "end-of-day reflection · 2026-06-29",
      payload: { text },
    });
  });
});
