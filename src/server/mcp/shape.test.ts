import { describe, expect, it } from "vitest";

import {
  matchProject,
  shapeBurn,
  shapeClients,
  shapeOpenTasks,
  shapeProjectTree,
  type BurnRow,
  type ClientListRow,
  type OpenTaskRow,
  type PhaseRow,
  type ProjectRow,
  type ProjectTaskRow,
} from "./shape";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";

describe("matchProject", () => {
  const projects = [
    { id: P1, name: "Great White — Dashboards" },
    { id: P2, name: "Hume Ops" },
    { id: P3, name: "Great White — Retainer" },
  ];

  it("finds by id", () => {
    expect(matchProject(P2, projects)).toEqual({ kind: "found", id: P2 });
  });

  it("finds by exact name, any case", () => {
    expect(matchProject("hume ops", projects)).toEqual({ kind: "found", id: P2 });
  });

  it("finds by a fragment that matches exactly one project", () => {
    expect(matchProject("retainer", projects)).toEqual({ kind: "found", id: P3 });
  });

  it("reports every candidate when a fragment is ambiguous", () => {
    const match = matchProject("great white", projects);
    expect(match.kind).toBe("ambiguous");
    expect(match.kind === "ambiguous" && match.candidates.map((c) => c.id)).toEqual([P1, P3]);
  });

  it("says none for an unknown name or an id that isn't this user's", () => {
    expect(matchProject("Suncoast", projects)).toEqual({ kind: "none" });
    expect(matchProject("44444444-4444-4444-8444-444444444444", projects)).toEqual({
      kind: "none",
    });
    expect(matchProject("   ", projects)).toEqual({ kind: "none" });
  });
});

function openTask(over: Partial<OpenTaskRow>): OpenTaskRow {
  return {
    id: "t",
    title: "Task",
    priority: 0,
    scheduledDate: null,
    projectId: null,
    projectName: null,
    phaseName: null,
    isTop3: false,
    completedAt: null,
    ...over,
  } as OpenTaskRow;
}

describe("shapeOpenTasks", () => {
  const tasks = [
    openTask({
      id: "late",
      title: "Late",
      scheduledDate: "2026-09-20",
      projectId: P1,
      projectName: "GW",
    }),
    openTask({
      id: "early",
      title: "Early",
      scheduledDate: "2026-09-15",
      priority: 3,
      projectId: P1,
    }),
    openTask({ id: "undated", title: "Someday", projectId: P2 }),
    openTask({ id: "out", title: "Out of range", scheduledDate: "2026-10-01" }),
  ];

  it("orders dated work soonest first, then undated, and maps priority to words", () => {
    const shaped = shapeOpenTasks(tasks, { limit: 100 });
    expect(shaped.tasks.map((t) => t.id)).toEqual(["early", "late", "out", "undated"]);
    expect(shaped.tasks[0]).toMatchObject({ priority: "high", due: "2026-09-15", done: false });
    expect(shaped.tasks[1]).not.toHaveProperty("priority");
  });

  it("applies an inclusive range and drops undated work unless asked", () => {
    const week = { from: "2026-09-15", to: "2026-09-20", limit: 100 };
    expect(shapeOpenTasks(tasks, week).tasks.map((t) => t.id)).toEqual(["early", "late"]);
    expect(
      shapeOpenTasks(tasks, { ...week, includeUnscheduled: true }).tasks.map((t) => t.id)
    ).toEqual(["early", "late", "undated"]);
  });

  it("filters by project and says when the list was cut short", () => {
    const shaped = shapeOpenTasks(tasks, { projectId: P1, limit: 1 });
    expect(shaped.count).toBe(2);
    expect(shaped).toMatchObject({ truncated: true, shown: 1 });
    expect(shaped.tasks.map((t) => t.id)).toEqual(["early"]);
  });
});

describe("shapeProjectTree", () => {
  const project = {
    id: P1,
    name: "Launch",
    state: "active",
    category: "business",
    billingType: "fixed_fee",
    why: null,
  } as unknown as ProjectRow;
  const phase = (id: string, name: string, parentPhaseId: string | null) =>
    ({
      id,
      name,
      parentPhaseId,
      startDate: "2026-09-01",
      endDate: null,
      estimateHours: 8,
      completedAt: null,
    }) as unknown as PhaseRow;
  const task = (id: string, phaseId: string | null, done = false) =>
    ({
      id,
      title: id,
      phaseId,
      priority: 0,
      scheduledDate: null,
      isTop3: false,
      completedAt: done ? new Date() : null,
    }) as unknown as ProjectTaskRow;

  it("nests phases, files tasks under their phase, and keeps loose tasks separate", () => {
    const tree = shapeProjectTree(
      project,
      [phase("build", "Build", null), phase("api", "API", "build")],
      [task("t1", "api"), task("t2", "build", true), task("t3", null)],
      "Great White"
    );
    expect(tree.client).toBe("Great White");
    expect(tree).toMatchObject({ tasks_done: 1, tasks_total: 3 });
    expect(tree.phases).toHaveLength(1);
    expect(tree.phases[0]!.tasks.map((t) => t.id)).toEqual(["t2"]);
    expect(tree.phases[0]!.phases[0]).toMatchObject({ name: "API", estimate_hours: 8 });
    expect(tree.phases[0]!.phases[0]!.tasks.map((t) => t.id)).toEqual(["t1"]);
    expect(tree.unphased_tasks.map((t) => t.id)).toEqual(["t3"]);
  });
});

describe("shapeClients", () => {
  it("reports the rate in currency units, not cents", () => {
    const shaped = shapeClients([
      {
        id: "c",
        name: "Hume",
        currency: "USD",
        defaultRateCents: 3000,
        billingThresholdHours: 20,
        notes: null,
      },
    ] as unknown as ClientListRow[]);
    expect(shaped.clients[0]).toEqual({
      id: "c",
      name: "Hume",
      currency: "USD",
      hourly_rate: 30,
      billing_threshold_hours: 20,
    });
  });
});

describe("shapeBurn", () => {
  const burn = (estimatedPhaseCount: number) =>
    ({
      projectId: P1,
      projectName: "Launch",
      billingType: "fixed_fee",
      message: null,
      fee: {
        effectiveRateCents: 9500,
        targetRateFloorCents: 8000,
        belowFloor: false,
        hoursUntilFloor: 11,
      },
      burn: {
        estimatedPhaseCount,
        hotPhaseCount: 0,
        total: {
          estimateHours: estimatedPhaseCount ? 10 : null,
          actualHours: 4,
          consumedPct: estimatedPhaseCount ? 40 : null,
          completedPct: 50,
          aheadByPct: estimatedPhaseCount ? -10 : null,
          state: "ok",
        },
        phases: [],
      },
    }) as unknown as BurnRow;

  it("says plainly when nothing is estimated", () => {
    expect(shapeBurn([burn(0)]).note).toMatch(/No phase has an hour estimate/);
    expect(shapeBurn([burn(2)])).not.toHaveProperty("note");
  });

  it("converts the fee read to per-hour currency units", () => {
    expect(shapeBurn([burn(2)]).projects[0]!.fee).toEqual({
      effective_rate_per_hour: 95,
      rate_floor_per_hour: 80,
      below_floor: false,
      hours_until_floor: 11,
    });
  });
});
