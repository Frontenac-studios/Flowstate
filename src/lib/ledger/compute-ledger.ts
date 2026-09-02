import { computeBudgetBar, type BudgetBar } from "@/lib/budget/compute-budget-bar";
import type { ReportClient, ReportEntry, ReportProject } from "@/lib/time/aggregate-time-report";

/**
 * W8 — the Ledger. The fortnightly retrospective of the Budget (W6): the tilt you
 * declared held against the minutes you actually logged, and where those minutes
 * went by client and by project.
 *
 * The headline reuses `computeBudgetBar` rather than recomputing a share, so the
 * Today bar and the Ledger can never disagree about what 41% means — the Ledger is
 * that same function over a fortnight-long denominator.
 *
 * Deliberately NOT `aggregateTimeReport` (W3), though it borrows that module's row
 * contracts so the shapes stay single-sourced. That one answers "what is this time
 * worth" — revenue, effective rate, a task tier. This one answers "where did the
 * tilt go": seconds and share only, two levels deep, no money. Rendering the money
 * report here would force the router to load `rates` and `tasks` it never shows.
 *
 * It also splits three ways where `aggregateTimeReport` splits one: that module
 * buckets every project with no client into a single "No client" node regardless of
 * category, which would merge personal life with business admin and make the tilt
 * read meaningless. Business-without-a-client and personal are separate groups here.
 *
 * The Maintenance project IS counted, as personal. The goal-layer exclusion
 * (`isGoalLayerEligible`, W11) must not be applied: `computeBudgetBar` already
 * counts Maintenance as personal, so filtering it out here would silently inflate
 * the business share and make the Ledger contradict the Budget it retrospects.
 */

export type LedgerGroupKind = "client" | "business_no_client" | "personal";

export type LedgerProjectRow = {
  projectId: string;
  name: string;
  seconds: number;
  /** Share of the fortnight's whole logged time, whole percent. */
  sharePct: number;
};

export type LedgerGroup = {
  kind: LedgerGroupKind;
  /** Set only for `kind: "client"`. */
  clientId: string | null;
  name: string;
  seconds: number;
  /** Share of the fortnight's whole logged time, whole percent. */
  sharePct: number;
  projects: LedgerProjectRow[];
};

export type Ledger = {
  /** The said-vs-spent headline, over the fortnight. */
  bar: BudgetBar;
  totalSeconds: number;
  /** Clients by time desc, then business-without-a-client, then personal. */
  groups: LedgerGroup[];
};

const BUSINESS_NO_CLIENT = "__business_no_client__";
const PERSONAL = "__personal__";

type Bucket = {
  kind: LedgerGroupKind;
  clientId: string | null;
  name: string;
  seconds: number;
  projects: Map<string, { name: string; seconds: number }>;
};

function sharePct(seconds: number, total: number): number {
  return total > 0 ? Math.round((seconds / total) * 100) : 0;
}

export function computeLedger(params: {
  entries: ReportEntry[];
  projects: ReportProject[];
  clients: ReportClient[];
  /** Declared business share 0–100, or null when never declared. */
  tiltBusinessPct: number | null;
}): Ledger {
  const projectById = new Map(params.projects.map((p) => [p.id, p]));
  const clientById = new Map(params.clients.map((c) => [c.id, c]));

  const buckets = new Map<string, Bucket>();
  let businessSeconds = 0;
  let personalSeconds = 0;

  for (const entry of params.entries) {
    const project = projectById.get(entry.projectId);
    // Defensive: an entry whose project is missing is skipped rather than
    // mis-bucketed, matching aggregateTimeReport.
    if (!project) continue;

    const seconds = Math.max(0, entry.seconds);
    if (project.category === "business") businessSeconds += seconds;
    else personalSeconds += seconds;

    let bucketKey: string;
    let kind: LedgerGroupKind;
    let clientId: string | null = null;
    let name: string;

    if (project.category === "personal") {
      bucketKey = PERSONAL;
      kind = "personal";
      name = "Personal";
    } else if (project.clientId === null) {
      bucketKey = BUSINESS_NO_CLIENT;
      kind = "business_no_client";
      name = "Business, no client";
    } else {
      bucketKey = `client:${project.clientId}`;
      kind = "client";
      clientId = project.clientId;
      name = clientById.get(project.clientId)?.name ?? "Unknown client";
    }

    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = { kind, clientId, name, seconds: 0, projects: new Map() };
      buckets.set(bucketKey, bucket);
    }
    bucket.seconds += seconds;

    const row = bucket.projects.get(project.id);
    if (row) row.seconds += seconds;
    else bucket.projects.set(project.id, { name: project.name, seconds });
  }

  const totalSeconds = businessSeconds + personalSeconds;

  const toGroup = (bucket: Bucket): LedgerGroup => ({
    kind: bucket.kind,
    clientId: bucket.clientId,
    name: bucket.name,
    seconds: bucket.seconds,
    sharePct: sharePct(bucket.seconds, totalSeconds),
    projects: Array.from(bucket.projects.entries())
      .map(([projectId, p]) => ({
        projectId,
        name: p.name,
        seconds: p.seconds,
        sharePct: sharePct(p.seconds, totalSeconds),
      }))
      .sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name)),
  });

  // Client work leads, biggest first; the two catch-alls sit below it in a fixed
  // order so the tilt story reads top-down rather than reshuffling week to week.
  const clientGroups = Array.from(buckets.values())
    .filter((b) => b.kind === "client")
    .sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name))
    .map(toGroup);

  const noClient = buckets.get(BUSINESS_NO_CLIENT);
  const personal = buckets.get(PERSONAL);

  const groups: LedgerGroup[] = [
    ...clientGroups,
    ...(noClient ? [toGroup(noClient)] : []),
    ...(personal ? [toGroup(personal)] : []),
  ];

  return {
    bar: computeBudgetBar({
      businessSeconds,
      personalSeconds,
      tiltBusinessPct: params.tiltBusinessPct,
    }),
    totalSeconds,
    groups,
  };
}
