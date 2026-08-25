import { formatDuration } from "@/lib/time/duration";

/**
 * The three data-driven W2d threshold alerts: a client crossing its billable
 * invoicing threshold, a project running past its estimate, and the weekly
 * hours-worked summary. (The forgot-to-stop timer alert lives with the timer.)
 *
 * The server produces a live `ThresholdSnapshot`; this pure selector decides which
 * alerts should fire *now* given what has already fired (`NotifiedState`, persisted
 * client-side). Each alert is edge-triggered — it fires on the transition into the
 * flagged state and re-arms when the value falls back, so an invoiced client or a
 * re-estimated project can legitimately alert again later without nagging in
 * between. The weekly summary fires at most once per ISO week.
 */

export const CLIENT_BILLABLE_THRESHOLD_SECONDS = 20 * 60 * 60; // 20h

export type ThresholdSnapshot = {
  clients: { clientId: string; name: string; billableUnbilledSeconds: number }[];
  projects: { projectId: string; name: string; estimateSeconds: number; actualSeconds: number }[];
  lastWeekWorkedSeconds: number;
  /** Current ISO week key (e.g. "2026-W34"), the weekly-summary dedup key. */
  isoWeek: string;
};

export type NotifiedState = {
  clientsAtThreshold: string[];
  projectsOverEstimate: string[];
  weeklyNotifiedWeek: string | null;
};

export type ThresholdAlert = {
  type: "client_threshold" | "project_over_estimate" | "weekly_hours";
  /** Stable de-dupe key + OS notification tag. */
  key: string;
  title: string;
  body: string;
};

export const EMPTY_NOTIFIED_STATE: NotifiedState = {
  clientsAtThreshold: [],
  projectsOverEstimate: [],
  weeklyNotifiedWeek: null,
};

export function selectThresholdAlerts(
  snapshot: ThresholdSnapshot,
  notified: NotifiedState
): { alerts: ThresholdAlert[]; next: NotifiedState } {
  const alerts: ThresholdAlert[] = [];

  const clientsAtThreshold = snapshot.clients
    .filter((c) => c.billableUnbilledSeconds >= CLIENT_BILLABLE_THRESHOLD_SECONDS)
    .map((c) => c.clientId);
  for (const client of snapshot.clients) {
    if (client.billableUnbilledSeconds < CLIENT_BILLABLE_THRESHOLD_SECONDS) continue;
    if (notified.clientsAtThreshold.includes(client.clientId)) continue;
    alerts.push({
      type: "client_threshold",
      key: `client-threshold-${client.clientId}`,
      title: "Ready to invoice",
      body: `${client.name} has passed 20h of unbilled time.`,
    });
  }

  const projectsOverEstimate = snapshot.projects
    .filter((p) => p.estimateSeconds > 0 && p.actualSeconds > p.estimateSeconds)
    .map((p) => p.projectId);
  for (const project of snapshot.projects) {
    if (project.estimateSeconds <= 0 || project.actualSeconds <= project.estimateSeconds) continue;
    if (notified.projectsOverEstimate.includes(project.projectId)) continue;
    alerts.push({
      type: "project_over_estimate",
      key: `project-over-estimate-${project.projectId}`,
      title: "Project over estimate",
      body: `${project.name}: ${formatDuration(project.actualSeconds)} logged against a ${formatDuration(
        project.estimateSeconds
      )} estimate.`,
    });
  }

  let weeklyNotifiedWeek = notified.weeklyNotifiedWeek;
  if (notified.weeklyNotifiedWeek !== snapshot.isoWeek && snapshot.lastWeekWorkedSeconds > 0) {
    alerts.push({
      type: "weekly_hours",
      key: `weekly-${snapshot.isoWeek}`,
      title: "Last week",
      body: `You logged ${formatDuration(snapshot.lastWeekWorkedSeconds)} of tracked work last week.`,
    });
    weeklyNotifiedWeek = snapshot.isoWeek;
  }

  return {
    alerts,
    next: { clientsAtThreshold, projectsOverEstimate, weeklyNotifiedWeek },
  };
}
