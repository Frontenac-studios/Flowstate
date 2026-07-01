import { describe, expect, it } from "vitest";

import {
  buildGentleEodWinPrompt,
  mergeReflectionProposals,
  templateReflectionBeat,
} from "./reflection-beat";
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

describe("mergeReflectionProposals", () => {
  it("keeps F1 order and caps at 3", () => {
    const base = [proposal("a", "A"), proposal("b", "B")];
    const supplemental = [proposal("c", "C"), proposal("d", "D")];
    const merged = mergeReflectionProposals(base, supplemental);
    expect(merged.map((p) => p.refId)).toEqual(["a", "b", "c"]);
  });

  it("dedupes supplemental against base", () => {
    const base = [proposal("a", "A")];
    const supplemental = [proposal("a", "A again"), proposal("b", "B")];
    const merged = mergeReflectionProposals(base, supplemental);
    expect(merged.map((p) => p.refId)).toEqual(["a", "b"]);
  });
});

describe("buildGentleEodWinPrompt", () => {
  it("never prompts on a quiet day with no proposals", () => {
    expect(buildGentleEodWinPrompt(quietDay, [])).toBeNull();
  });

  it("never uses guilt framing when there are no wins", () => {
    const prompt = buildGentleEodWinPrompt(quietDay, []);
    expect(prompt).toBeNull();
  });

  it("prompts when proposals exist", () => {
    expect(buildGentleEodWinPrompt(quietDay, [proposal("a", "Win")])).toContain("resonates");
  });

  it("offers open add when there was activity but no proposals", () => {
    const prompt = buildGentleEodWinPrompt({ ...quietDay, completionsToday: 2 }, []);
    expect(prompt).toContain("Anything small");
  });

  it("skips prompt when wins are already accepted", () => {
    expect(buildGentleEodWinPrompt({ ...quietDay, acceptedWinCount: 2 }, [])).toBeNull();
  });
});

describe("templateReflectionBeat", () => {
  it("returns merged proposals and a single gentle prompt", () => {
    const result = templateReflectionBeat([proposal("a", "Ship fix")], [], {
      ...quietDay,
      completionsToday: 1,
    });
    expect(result.proposals).toHaveLength(1);
    expect(result.gentlePrompt).toContain("resonates");
  });
});
