import { describe, expect, it } from "vitest";

import type { CandidateRate } from "@/lib/rates/resolve-rate";

import { aggregateTimeReport, type ReportEntry } from "./aggregate-time-report";

// Hand-computed fixture (spec W3): $150/h client rate on Great White.
// e1  Launch/API     billable 1h    -> $150
// e2  Launch/no-task billable 0.5h  -> $75
// e3  Internal       billable 1h    -> no client, no rate -> $0
// e4  Blog           non-billable 2h (personal)          -> $0
// Totals: 4.5h worked, 2.5h billable, 2h non-billable; 2.5h business (p1+p2), 2h personal.
// Revenue $225; effective rate = $225 / 4.5h = $50/h.
const asOf = new Date("2026-08-24T00:00:00Z");
const ratesByClient = new Map<string, CandidateRate[]>([
  ["c1", [{ projectId: null, amountCents: 15000, effectiveFrom: new Date("2026-01-01") }]],
]);
const projects = [
  { id: "p1", name: "Launch", clientId: "c1", category: "business" as const },
  { id: "p2", name: "Internal", clientId: null, category: "business" as const },
  { id: "p3", name: "Blog", clientId: null, category: "personal" as const },
];
const entries: ReportEntry[] = [
  { projectId: "p1", taskId: "t1", billable: true, seconds: 3600 },
  { projectId: "p1", taskId: null, billable: true, seconds: 1800 },
  { projectId: "p2", taskId: null, billable: true, seconds: 3600 },
  { projectId: "p3", taskId: null, billable: false, seconds: 7200 },
];

describe("aggregateTimeReport", () => {
  const report = aggregateTimeReport({
    entries,
    projects,
    clients: [{ id: "c1", name: "Great White" }],
    tasks: [{ id: "t1", title: "API" }],
    ratesByClient,
    asOf,
  });

  it("sums totals and the billable / business-personal splits", () => {
    expect(report.totals).toEqual({
      totalSeconds: 16200,
      billableSeconds: 9000,
      nonBillableSeconds: 7200,
      businessSeconds: 9000,
      personalSeconds: 7200,
    });
  });

  it("computes revenue and the effective rate (revenue ÷ ALL hours)", () => {
    expect(report.revenueCents).toBe(22500);
    expect(report.effectiveRateCents).toBe(5000); // $50/h
  });

  it("groups client → project → task, each level summing", () => {
    const gw = report.clients.find((c) => c.clientId === "c1");
    expect(gw?.seconds).toBe(5400);
    expect(gw?.revenueCents).toBe(22500);
    const launch = gw?.projects.find((p) => p.projectId === "p1");
    expect(launch?.tasks.map((t) => t.title)).toEqual(["API", "No task"]); // sorted by seconds
    expect(launch?.tasks.find((t) => t.taskId === null)?.seconds).toBe(1800);

    const noClient = report.clients.find((c) => c.clientId === null);
    expect(noClient?.seconds).toBe(10800);
    expect(noClient?.revenueCents).toBe(0);
    expect(noClient?.projects.map((p) => p.name)).toEqual(["Blog", "Internal"]); // 2h before 1h
  });

  it("orders clients by time spent", () => {
    expect(report.clients.map((c) => c.clientId)).toEqual([null, "c1"]); // 3h > 1.5h
  });
});
