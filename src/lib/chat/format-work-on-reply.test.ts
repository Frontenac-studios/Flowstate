import { describe, expect, it, beforeEach, vi } from "vitest";

import { formatWorkOnReply } from "./format-work-on-reply";

describe("formatWorkOnReply", () => {
  beforeEach(() => {
    vi.stubEnv("NUDGE_DEBUG_HOUR", "14");
  });

  it("returns empty-pool message when no pick", () => {
    expect(
      formatWorkOnReply({
        pick: null,
        stalledTop3: [],
        localHour: 10,
        nudgeThresholdHour: 14,
      })
    ).toContain("Nothing on deck for today yet");
  });

  it("formats a pick with reason", () => {
    expect(
      formatWorkOnReply({
        pick: { title: "Ship fix", pickReason: "it's Top 3" },
        stalledTop3: [],
        localHour: 10,
        nudgeThresholdHour: 14,
      })
    ).toBe("Try **Ship fix** — it's Top 3.");
  });

  it("appends stalled Top 3 reminder after nudge hour", () => {
    const text = formatWorkOnReply({
      pick: { title: "Small task", pickReason: "next on your list" },
      stalledTop3: [
        { title: "Big one", top3Order: 1 },
        { title: "Other", top3Order: 2 },
      ],
      localHour: 15,
      nudgeThresholdHour: 14,
    });

    expect(text).toContain("Try **Small task**");
    expect(text).toContain("You still have ① **Big one**, ② **Other** on your Top 3");
  });

  it("skips stalled reminder before nudge hour", () => {
    const text = formatWorkOnReply({
      pick: { title: "Small task", pickReason: "next on your list" },
      stalledTop3: [{ title: "Big one", top3Order: 1 }],
      localHour: 10,
      nudgeThresholdHour: 14,
    });

    expect(text).not.toContain("You still have");
  });
});
