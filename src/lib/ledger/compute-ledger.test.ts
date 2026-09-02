import { describe, expect, it } from "vitest";

import type { ReportClient, ReportEntry, ReportProject } from "@/lib/time/aggregate-time-report";

import { computeLedger } from "./compute-ledger";

const HOUR = 3600;

const clients: ReportClient[] = [
  { id: "c-gw", name: "Great White" },
  { id: "c-hume", name: "Hume" },
];

const projects: ReportProject[] = [
  { id: "p-gw-build", name: "GW — Build", clientId: "c-gw", category: "business" },
  { id: "p-gw-support", name: "GW — Support", clientId: "c-gw", category: "business" },
  { id: "p-hume", name: "Hume CRM", clientId: "c-hume", category: "business" },
  { id: "p-admin", name: "Admin & sales", clientId: null, category: "business" },
  { id: "p-maint", name: "Maintenance", clientId: null, category: "personal" },
  { id: "p-house", name: "House", clientId: null, category: "personal" },
];

const entry = (projectId: string, seconds: number): ReportEntry => ({
  projectId,
  taskId: null,
  billable: false,
  seconds,
});

describe("computeLedger", () => {
  /**
   * The acceptance criterion, as arithmetic: 41 business hours of a 100-hour
   * fortnight against a declared 70% is the "you said 70%, you spent 41%" read.
   */
  const saidSeventySpentFortyOne: ReportEntry[] = [
    entry("p-gw-build", 20 * HOUR),
    entry("p-gw-support", 6 * HOUR),
    entry("p-hume", 10 * HOUR),
    entry("p-admin", 5 * HOUR),
    entry("p-maint", 9 * HOUR),
    entry("p-house", 50 * HOUR),
  ];

  it("states the declared tilt against the fortnight actually spent", () => {
    const ledger = computeLedger({
      entries: saidSeventySpentFortyOne,
      projects,
      clients,
      tiltBusinessPct: 70,
    });

    expect(ledger.totalSeconds).toBe(100 * HOUR);
    expect(ledger.bar.tiltBusinessPct).toBe(70);
    expect(ledger.bar.actualBusinessPct).toBe(41);
    expect(ledger.bar.deltaPct).toBe(-29);
    expect(ledger.bar.state).toBe("measuring");
  });

  it("breaks the fortnight down by client, biggest first", () => {
    const ledger = computeLedger({
      entries: saidSeventySpentFortyOne,
      projects,
      clients,
      tiltBusinessPct: 70,
    });

    const [first, second] = ledger.groups;
    expect(first.kind).toBe("client");
    expect(first.name).toBe("Great White");
    expect(first.seconds).toBe(26 * HOUR);
    expect(first.sharePct).toBe(26);
    expect(second.name).toBe("Hume");
  });

  it("rolls a client's projects up and lists them by time", () => {
    const ledger = computeLedger({
      entries: saidSeventySpentFortyOne,
      projects,
      clients,
      tiltBusinessPct: 70,
    });

    const gw = ledger.groups.find((g) => g.clientId === "c-gw")!;
    expect(gw.projects.map((p) => [p.name, p.seconds])).toEqual([
      ["GW — Build", 20 * HOUR],
      ["GW — Support", 6 * HOUR],
    ]);
  });

  it("keeps business-without-a-client separate from personal", () => {
    // aggregateTimeReport merges both into one "No client" node; merging them here
    // would put admin time and house time in the same bucket and make the tilt
    // read meaningless.
    const ledger = computeLedger({
      entries: saidSeventySpentFortyOne,
      projects,
      clients,
      tiltBusinessPct: 70,
    });

    const noClient = ledger.groups.find((g) => g.kind === "business_no_client")!;
    const personal = ledger.groups.find((g) => g.kind === "personal")!;
    expect(noClient.seconds).toBe(5 * HOUR);
    expect(personal.seconds).toBe(59 * HOUR);
  });

  it("counts Maintenance as personal, matching the Budget", () => {
    // W11 excludes Maintenance from goal-layer surfaces; applying that filter here
    // would inflate the business share and contradict the bar this retrospects.
    const ledger = computeLedger({
      entries: [entry("p-gw-build", 1 * HOUR), entry("p-maint", 1 * HOUR)],
      projects,
      clients,
      tiltBusinessPct: 70,
    });
    expect(ledger.bar.actualBusinessPct).toBe(50);
    const personal = ledger.groups.find((g) => g.kind === "personal")!;
    expect(personal.projects.map((p) => p.name)).toEqual(["Maintenance"]);
  });

  it("orders the catch-all groups below client work, personal last", () => {
    const ledger = computeLedger({
      entries: saidSeventySpentFortyOne,
      projects,
      clients,
      tiltBusinessPct: 70,
    });
    expect(ledger.groups.map((g) => g.kind)).toEqual([
      "client",
      "client",
      "business_no_client",
      "personal",
    ]);
  });

  it("shares sum to the whole fortnight, give or take rounding", () => {
    const ledger = computeLedger({
      entries: saidSeventySpentFortyOne,
      projects,
      clients,
      tiltBusinessPct: 70,
    });
    const total = ledger.groups.reduce((sum, g) => sum + g.sharePct, 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(2);
  });

  it("reports an empty fortnight without inventing a share", () => {
    const ledger = computeLedger({ entries: [], projects, clients, tiltBusinessPct: 70 });
    expect(ledger.bar.state).toBe("empty");
    expect(ledger.bar.actualBusinessPct).toBeNull();
    expect(ledger.totalSeconds).toBe(0);
    expect(ledger.groups).toEqual([]);
  });

  it("still shows where the time went when no tilt was ever declared", () => {
    // The `unset` state is a populated read, not a prompt to fill in a form (§8b).
    const ledger = computeLedger({
      entries: saidSeventySpentFortyOne,
      projects,
      clients,
      tiltBusinessPct: null,
    });
    expect(ledger.bar.state).toBe("unset");
    expect(ledger.bar.actualBusinessPct).toBe(41);
    expect(ledger.bar.deltaPct).toBeNull();
    expect(ledger.groups.length).toBe(4);
  });

  it("skips an entry whose project is missing rather than mis-bucketing it", () => {
    const ledger = computeLedger({
      entries: [entry("p-gw-build", 2 * HOUR), entry("p-deleted", 5 * HOUR)],
      projects,
      clients,
      tiltBusinessPct: 70,
    });
    expect(ledger.totalSeconds).toBe(2 * HOUR);
  });

  it("names a client it cannot resolve rather than dropping the time", () => {
    const ledger = computeLedger({
      entries: [entry("p-hume", 3 * HOUR)],
      projects,
      clients: [],
      tiltBusinessPct: 70,
    });
    expect(ledger.groups[0].name).toBe("Unknown client");
    expect(ledger.totalSeconds).toBe(3 * HOUR);
  });
});
