import { describe, expect, it } from "vitest";

import {
  CLIENT_BILLABLE_THRESHOLD_SECONDS,
  EMPTY_NOTIFIED_STATE,
  selectThresholdAlerts,
  type ThresholdSnapshot,
} from "./threshold-alerts";

const H = 3600;
const base: ThresholdSnapshot = {
  clients: [],
  projects: [],
  lastWeekWorkedSeconds: 0,
  isoWeek: "2026-W34",
};

describe("selectThresholdAlerts", () => {
  it("fires a client alert only on the transition past 20h", () => {
    const snap = {
      ...base,
      clients: [{ clientId: "c1", name: "Great White", billableUnbilledSeconds: 21 * H }],
    };
    const first = selectThresholdAlerts(snap, EMPTY_NOTIFIED_STATE);
    expect(first.alerts.map((a) => a.type)).toEqual(["client_threshold"]);
    expect(first.alerts[0]!.body).toContain("Great White");

    // Already flagged → no repeat.
    const second = selectThresholdAlerts(snap, first.next);
    expect(second.alerts).toEqual([]);
  });

  it("re-arms a client alert after it drops back below (e.g. invoiced)", () => {
    const above = {
      ...base,
      clients: [{ clientId: "c1", name: "GW", billableUnbilledSeconds: 21 * H }],
    };
    const flagged = selectThresholdAlerts(above, EMPTY_NOTIFIED_STATE).next;

    const below = {
      ...base,
      clients: [{ clientId: "c1", name: "GW", billableUnbilledSeconds: 2 * H }],
    };
    const cleared = selectThresholdAlerts(below, flagged);
    expect(cleared.next.clientsAtThreshold).toEqual([]);

    // Crosses again → fires again.
    const again = selectThresholdAlerts(above, cleared.next);
    expect(again.alerts.map((a) => a.type)).toEqual(["client_threshold"]);
  });

  it("does not fire below the threshold", () => {
    const snap = {
      ...base,
      clients: [
        {
          clientId: "c1",
          name: "GW",
          billableUnbilledSeconds: CLIENT_BILLABLE_THRESHOLD_SECONDS - 1,
        },
      ],
    };
    expect(selectThresholdAlerts(snap, EMPTY_NOTIFIED_STATE).alerts).toEqual([]);
  });

  it("fires an over-estimate alert only when actual exceeds a real estimate", () => {
    const over = {
      ...base,
      projects: [
        { projectId: "p1", name: "Launch", estimateSeconds: 10 * H, actualSeconds: 12 * H },
      ],
    };
    expect(selectThresholdAlerts(over, EMPTY_NOTIFIED_STATE).alerts.map((a) => a.type)).toEqual([
      "project_over_estimate",
    ]);

    const noEstimate = {
      ...base,
      projects: [{ projectId: "p2", name: "Ad hoc", estimateSeconds: 0, actualSeconds: 40 * H }],
    };
    expect(selectThresholdAlerts(noEstimate, EMPTY_NOTIFIED_STATE).alerts).toEqual([]);
  });

  it("fires the weekly summary once per ISO week, only with hours logged", () => {
    const snap = { ...base, lastWeekWorkedSeconds: 32 * H };
    const first = selectThresholdAlerts(snap, EMPTY_NOTIFIED_STATE);
    expect(first.alerts.map((a) => a.type)).toEqual(["weekly_hours"]);
    expect(first.alerts[0]!.body).toContain("32h");

    // Same week → silent.
    expect(selectThresholdAlerts(snap, first.next).alerts).toEqual([]);

    // New week → fires again.
    const nextWeek = { ...snap, isoWeek: "2026-W35" };
    expect(selectThresholdAlerts(nextWeek, first.next).alerts.map((a) => a.type)).toEqual([
      "weekly_hours",
    ]);
  });

  it("stays silent for a zero-hours week", () => {
    const snap = { ...base, lastWeekWorkedSeconds: 0 };
    expect(selectThresholdAlerts(snap, EMPTY_NOTIFIED_STATE).alerts).toEqual([]);
  });
});
