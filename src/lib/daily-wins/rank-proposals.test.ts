import { describe, expect, it } from "vitest";

import { buildWinCandidates } from "./build-candidates";
import { rankProposals } from "./rank-proposals";
import { WIN_PROPOSAL_TIERS } from "./types";

const at = (iso: string) => new Date(iso);

describe("rankProposals", () => {
  it("orders tiers: top-3 before priority/effort before care", () => {
    const candidates = buildWinCandidates({
      tasks: [
        {
          id: "t-priority",
          title: "Big task",
          isTop3: false,
          top3Order: null,
          priority: 5,
          timeEstimateMinutes: 90,
          completedAt: at("2026-07-01T20:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
        {
          id: "t-top3",
          title: "Top 3 win",
          isTop3: true,
          top3Order: 1,
          priority: 0,
          timeEstimateMinutes: 15,
          completedAt: at("2026-07-01T10:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
      ],
      careEvents: [
        {
          id: "c1",
          label: "Walk",
          occurredAt: at("2026-07-01T21:00:00.000Z"),
        },
      ],
      abyssActions: [],
    });

    const ranked = rankProposals(candidates);
    expect(ranked.map((p) => p.refId)).toEqual(["t-top3", "t-priority", "c1"]);
    expect(ranked[0]?.tier).toBe(WIN_PROPOSAL_TIERS.top3Done);
  });

  it("caps care events at one in the proposal set", () => {
    const candidates = buildWinCandidates({
      tasks: [
        {
          id: "t1",
          title: "Shipped fix",
          isTop3: false,
          top3Order: null,
          priority: 3,
          timeEstimateMinutes: 45,
          completedAt: at("2026-07-01T16:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
      ],
      careEvents: [
        { id: "c1", label: "Walk", occurredAt: at("2026-07-01T12:00:00.000Z") },
        { id: "c2", label: "Stretch", occurredAt: at("2026-07-01T13:00:00.000Z") },
        { id: "c3", label: "Water", occurredAt: at("2026-07-01T14:00:00.000Z") },
      ],
      abyssActions: [
        {
          id: "a1",
          title: "Promoted idea",
          occurredAt: at("2026-07-01T15:00:00.000Z"),
        },
      ],
    });

    const ranked = rankProposals(candidates);
    expect(ranked).toHaveLength(3);
    expect(ranked.filter((p) => p.source === "care_event")).toHaveLength(1);
    expect(ranked.map((p) => p.source)).toEqual(["task", "care_event", "abyss"]);
  });

  it("never returns more than three proposals", () => {
    const candidates = buildWinCandidates({
      tasks: Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        title: `Task ${i}`,
        isTop3: false,
        top3Order: null,
        priority: i,
        timeEstimateMinutes: 30,
        completedAt: at(`2026-07-01T1${i}:00:00.000Z`),
        milestoneId: null,
        milestoneTitle: null,
      })),
      careEvents: [],
      abyssActions: [],
    });

    expect(rankProposals(candidates)).toHaveLength(3);
  });

  it("skips dismissed and already-accepted ref ids", () => {
    const candidates = buildWinCandidates({
      tasks: [
        {
          id: "t1",
          title: "One",
          isTop3: true,
          top3Order: 1,
          priority: 0,
          timeEstimateMinutes: null,
          completedAt: at("2026-07-01T10:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
        {
          id: "t2",
          title: "Two",
          isTop3: true,
          top3Order: 2,
          priority: 0,
          timeEstimateMinutes: null,
          completedAt: at("2026-07-01T11:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
      ],
      careEvents: [],
      abyssActions: [],
    });

    const ranked = rankProposals(candidates, {
      dismissedRefIds: new Set(["t1"]),
      acceptedRefIds: new Set(["t2"]),
    });

    expect(ranked).toHaveLength(0);
  });

  it("promotes the next candidate when a higher-ranked proposal was dismissed", () => {
    const candidates = buildWinCandidates({
      tasks: [
        {
          id: "t1",
          title: "Top win",
          isTop3: true,
          top3Order: 1,
          priority: 0,
          timeEstimateMinutes: null,
          completedAt: at("2026-07-01T10:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
        {
          id: "t2",
          title: "Second win",
          isTop3: true,
          top3Order: 2,
          priority: 0,
          timeEstimateMinutes: null,
          completedAt: at("2026-07-01T11:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
      ],
      careEvents: [],
      abyssActions: [],
    });

    const ranked = rankProposals(candidates, {
      dismissedRefIds: new Set(["t1"]),
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.refId).toBe("t2");
  });

  it("keeps accepted wins out of proposals while still honoring dismissals", () => {
    const candidates = buildWinCandidates({
      tasks: [
        {
          id: "t1",
          title: "Kept",
          isTop3: true,
          top3Order: 1,
          priority: 0,
          timeEstimateMinutes: null,
          completedAt: at("2026-07-01T10:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
        {
          id: "t2",
          title: "Dismissed",
          isTop3: true,
          top3Order: 2,
          priority: 0,
          timeEstimateMinutes: null,
          completedAt: at("2026-07-01T11:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
        {
          id: "t3",
          title: "Next up",
          isTop3: false,
          top3Order: null,
          priority: 4,
          timeEstimateMinutes: 60,
          completedAt: at("2026-07-01T12:00:00.000Z"),
          milestoneId: null,
          milestoneTitle: null,
        },
      ],
      careEvents: [],
      abyssActions: [],
    });

    const ranked = rankProposals(candidates, {
      dismissedRefIds: new Set(["t2"]),
      acceptedRefIds: new Set(["t1"]),
    });

    expect(ranked.map((p) => p.refId)).toEqual(["t3"]);
  });
});
