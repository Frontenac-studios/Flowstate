import { describe, expect, it } from "vitest";

import { buildWaitingOnYou, FOLLOW_UP_DUE_DAYS, type WaitingLead } from "./waiting-on-you";

const NOW = new Date("2026-09-02T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function lead(over: Partial<WaitingLead> & { id: string; state: string }): WaitingLead {
  return {
    companyName: over.companyName ?? `Co ${over.id}`,
    lastSentAt: null,
    projectId: null,
    ...over,
  };
}

describe("buildWaitingOnYou", () => {
  it("folds every sourced lead into one batch row", () => {
    const rows = buildWaitingOnYou({
      leads: [
        lead({ id: "a", state: "new", companyName: "Alpha" }),
        lead({ id: "b", state: "new", companyName: "Beta" }),
        lead({ id: "c", state: "new", companyName: "Gamma" }),
        lead({ id: "d", state: "new", companyName: "Delta" }),
      ],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("sourced");
    expect(rows[0].count).toBe(4);
    expect(rows[0].label).toBe("4 sourced prospects to triage");
    // Names preview the batch, capped at three.
    expect(rows[0].detail).toBe("Alpha · Beta · Gamma");
  });

  it("says prospect, singular, for one", () => {
    const rows = buildWaitingOnYou({
      leads: [lead({ id: "a", state: "new" })],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows[0].label).toBe("1 sourced prospect to triage");
  });

  it("owes a follow-up only once the aging clock is up", () => {
    const rows = buildWaitingOnYou({
      leads: [
        lead({ id: "fresh", state: "contacted", lastSentAt: daysAgo(1) }),
        lead({ id: "due", state: "contacted", lastSentAt: daysAgo(FOLLOW_UP_DUE_DAYS) }),
      ],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows.map((r) => r.id)).toEqual(["due"]);
    expect(rows[0].detail).toBe(`${FOLLOW_UP_DUE_DAYS}d since you wrote`);
  });

  it("owes a follow-up on a contacted lead nothing was ever sent to", () => {
    const rows = buildWaitingOnYou({
      leads: [lead({ id: "silent", state: "contacted", lastSentAt: null })],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows[0].kind).toBe("follow_up");
    expect(rows[0].detail).toBe("contacted — nothing sent yet");
    expect(rows[0].agedDays).toBeUndefined();
  });

  it("orders by urgency: proposal, follow-ups oldest-first, engaged, then the batch", () => {
    const rows = buildWaitingOnYou({
      leads: [
        lead({ id: "new1", state: "new" }),
        lead({ id: "eng", state: "engaged", companyName: "Engaged Co" }),
        lead({ id: "old", state: "contacted", lastSentAt: daysAgo(30), companyName: "Old" }),
        lead({ id: "recent", state: "contacted", lastSentAt: daysAgo(6), companyName: "Recent" }),
        lead({ id: "prop", state: "proposal", companyName: "Proposal Co" }),
      ],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows.map((r) => r.id)).toEqual(["prop", "old", "recent", "eng", "sourced"]);
    expect(rows.map((r) => r.kind)).toEqual(["deal", "follow_up", "follow_up", "deal", "sourced"]);
  });

  it("sorts a never-written lead above every aged one", () => {
    const rows = buildWaitingOnYou({
      leads: [
        lead({ id: "aged", state: "contacted", lastSentAt: daysAgo(90) }),
        lead({ id: "silent", state: "contacted", lastSentAt: null }),
      ],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows.map((r) => r.id)).toEqual(["silent", "aged"]);
  });

  it("keeps hand-made prospect projects that have no lead behind them", () => {
    const rows = buildWaitingOnYou({
      leads: [],
      orphanProjects: [{ id: "p1", name: "Hand-added", clientName: "Acme" }],
      now: NOW,
    });
    expect(rows).toEqual([
      {
        kind: "deal",
        id: "p1",
        label: "Hand-added",
        detail: "Acme",
        href: "/projects/p1",
      },
    ]);
  });

  it("links a deal straight to its project when it has one", () => {
    const rows = buildWaitingOnYou({
      leads: [lead({ id: "d", state: "proposal", projectId: "proj-1" })],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows[0].href).toBe("/projects/proj-1");
  });

  it("ignores closed, dismissed and snoozed leads entirely", () => {
    const rows = buildWaitingOnYou({
      leads: [
        lead({ id: "s", state: "signed" }),
        lead({ id: "l", state: "lost" }),
        lead({ id: "x", state: "declined" }),
        lead({ id: "d", state: "dismissed" }),
        lead({ id: "z", state: "snoozed" }),
      ],
      orphanProjects: [],
      now: NOW,
    });
    expect(rows).toEqual([]);
  });
});
