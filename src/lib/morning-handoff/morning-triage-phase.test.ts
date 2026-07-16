import { describe, expect, it } from "vitest";

import {
  advanceAfterSkip,
  dumpUnlocked,
  nextPhaseAfterComplete,
  resolveInitialPhase,
  shouldCircleBackToProjects,
} from "./morning-triage-phase";

describe("morning-triage-phase", () => {
  const emptyCounts = { carryoverCount: 0, inboxCount: 0 };
  const withCarryovers = { carryoverCount: 2, inboxCount: 0 };
  const withInbox = { carryoverCount: 0, inboxCount: 3 };

  it("starts on carryovers when unfinished work exists, otherwise projects", () => {
    expect(resolveInitialPhase(withCarryovers)).toBe("carryovers");
    expect(resolveInitialPhase(emptyCounts)).toBe("projects");
  });

  it("walks greeting → carryovers → projects → inbox → dump → ready", () => {
    expect(nextPhaseAfterComplete("greeting", withCarryovers)).toBe("carryovers");
    expect(nextPhaseAfterComplete("carryovers", withInbox)).toBe("projects");
    expect(nextPhaseAfterComplete("projects", withInbox)).toBe("inbox");
    expect(nextPhaseAfterComplete("inbox", withInbox)).toBe("dump");
    expect(nextPhaseAfterComplete("dump", withInbox)).toBe("ready");
    expect(nextPhaseAfterComplete("ready", withInbox)).toBe("ready");
  });

  it("skips inbox when empty", () => {
    expect(nextPhaseAfterComplete("projects", emptyCounts)).toBe("dump");
  });

  it("skip-to-dump jumps straight to dump and unlocks composer", () => {
    expect(advanceAfterSkip("carryovers")).toBe("dump");
    expect(dumpUnlocked("carryovers")).toBe(false);
    expect(dumpUnlocked("dump", true)).toBe(true);
    expect(dumpUnlocked("inbox")).toBe(true);
  });

  it("circles back to projects when skipped with suggestions remaining", () => {
    expect(
      shouldCircleBackToProjects({
        projectsSkipped: true,
        projectsResolved: false,
        hasRemainingSuggestions: true,
        phase: "dump",
      })
    ).toBe(true);
    expect(
      shouldCircleBackToProjects({
        projectsSkipped: true,
        projectsResolved: true,
        hasRemainingSuggestions: true,
        phase: "dump",
      })
    ).toBe(false);
    expect(
      shouldCircleBackToProjects({
        projectsSkipped: true,
        projectsResolved: false,
        hasRemainingSuggestions: true,
        phase: "projects",
      })
    ).toBe(false);
  });
});
