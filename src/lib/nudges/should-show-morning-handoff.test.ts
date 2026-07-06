import { describe, expect, it } from "vitest";

import { shouldShowMorningHandoff } from "./should-show-morning-handoff";

describe("shouldShowMorningHandoff", () => {
  it("shows when enabled, not dismissed, and server says unseen", () => {
    expect(
      shouldShowMorningHandoff({
        enabled: true,
        dismissedLocally: false,
        seen: false,
      })
    ).toBe(true);
  });

  it("hides when locally dismissed even if server still says unseen", () => {
    expect(
      shouldShowMorningHandoff({
        enabled: true,
        dismissedLocally: true,
        seen: false,
      })
    ).toBe(false);
  });

  it("hides when server says seen", () => {
    expect(
      shouldShowMorningHandoff({
        enabled: true,
        dismissedLocally: false,
        seen: true,
      })
    ).toBe(false);
  });

  it("hides while server state is loading", () => {
    expect(
      shouldShowMorningHandoff({
        enabled: true,
        dismissedLocally: false,
        seen: undefined,
      })
    ).toBe(false);
  });

  it("hides when assistance is disabled", () => {
    expect(
      shouldShowMorningHandoff({
        enabled: false,
        dismissedLocally: false,
        seen: false,
      })
    ).toBe(false);
  });

  it("yields to another blocking ritual (e.g. Monday entry)", () => {
    expect(
      shouldShowMorningHandoff({
        enabled: true,
        dismissedLocally: false,
        seen: false,
        blockedByOtherRitual: true,
      })
    ).toBe(false);
  });
});
