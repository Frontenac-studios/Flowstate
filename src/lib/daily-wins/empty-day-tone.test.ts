import { describe, expect, it } from "vitest";

import { buildGentleEodWinPrompt, templateReflectionBeat } from "./reflection-beat";
import { EMPTY_DAY_FOOTER, isJudgmentFreeCopy, shouldShowEmptyDayFooter } from "./empty-day-tone";
import { WIN_PROPOSAL_TIERS } from "./types";

const proposal = (refId: string, label: string) => ({
  source: "task" as const,
  refId,
  label,
  tier: WIN_PROPOSAL_TIERS.top3Done,
  occurredAt: new Date("2026-07-01T12:00:00.000Z"),
});

const quietDay = {
  winDate: "2026-07-01",
  completionsToday: 0,
  top3DoneCount: 0,
  careEventCount: 0,
  acceptedWinCount: 0,
};

describe("shouldShowEmptyDayFooter", () => {
  it("shows the footer on a writable day with no wins or proposals", () => {
    expect(shouldShowEmptyDayFooter({ writable: true, filledCount: 0, proposalCount: 0 })).toBe(
      true
    );
  });

  it("hides the footer when ghosted proposals exist", () => {
    expect(shouldShowEmptyDayFooter({ writable: true, filledCount: 0, proposalCount: 2 })).toBe(
      false
    );
  });

  it("hides the footer when the day is read-only after rollover", () => {
    expect(shouldShowEmptyDayFooter({ writable: false, filledCount: 0, proposalCount: 0 })).toBe(
      false
    );
  });

  it("hides the footer once a win is accepted", () => {
    expect(shouldShowEmptyDayFooter({ writable: true, filledCount: 1, proposalCount: 0 })).toBe(
      false
    );
  });
});

describe("empty-day copy tone", () => {
  it("uses the warm empty-day footer without guilt framing", () => {
    expect(EMPTY_DAY_FOOTER).toBe("Tomorrow's a fresh page.");
    expect(isJudgmentFreeCopy(EMPTY_DAY_FOOTER)).toBe(true);
  });

  it("keeps reflection prompts judgment-free", () => {
    const prompts = [
      buildGentleEodWinPrompt(quietDay, [proposal("a", "Win")]),
      buildGentleEodWinPrompt({ ...quietDay, completionsToday: 2 }, []),
      templateReflectionBeat([proposal("a", "Ship fix")], [], {
        ...quietDay,
        completionsToday: 1,
      }).gentlePrompt,
    ].filter((p): p is string => p != null);

    for (const prompt of prompts) {
      expect(isJudgmentFreeCopy(prompt)).toBe(true);
    }
  });

  it("never emits a prompt on a fully quiet day", () => {
    expect(buildGentleEodWinPrompt(quietDay, [])).toBeNull();
  });
});
