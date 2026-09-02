/**
 * W10g — the Week seam. "Waiting on you" folds the pipeline and the outreach into
 * ONE urgency-sorted queue with three visually-distinct row types (v1-scope §W14):
 * the sourced batch, follow-ups owed, and live deals needing a move.
 *
 * Deliberately **no funnel stage counts** — those live on the Projects board. Week
 * answers "what needs me", not "how is the pipeline shaped".
 *
 * Pure and clock-injected so the ordering can be checked against a fixture: the
 * router does the reads, this decides what is urgent.
 */

/** A follow-up is "owed" once this many days have passed since you last wrote. */
export const FOLLOW_UP_DUE_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type WaitingRowKind = "sourced" | "follow_up" | "deal";

export type WaitingLead = {
  id: string;
  companyName: string;
  /** The pipeline stage: new | contacted | engaged | proposal. */
  state: string;
  /** When you last marked a message sent to them, or null if you never have. */
  lastSentAt: Date | null;
  projectId: string | null;
  clientName?: string | null;
};

/** A prospect project with no lead behind it — someone added it by hand. */
export type WaitingProject = {
  id: string;
  name: string;
  clientName: string | null;
};

export type WaitingRow = {
  kind: WaitingRowKind;
  /** Lead id, project id, or the literal "sourced" for the batch row. */
  id: string;
  label: string;
  /** The second line: why this row is here. Empty string when the label says it all. */
  detail: string;
  /** For a follow-up: whole days since you last wrote. */
  agedDays?: number;
  /** Where the row leads. */
  href: string;
  /** How many leads the row stands for (the sourced batch folds many into one). */
  count?: number;
};

/**
 * Urgency, not stage order. A proposal out for signature is the most expensive thing
 * to let rot; a follow-up you already owe comes next (oldest first); an engaged
 * conversation after that; the sourced batch last, because triaging cold names is
 * the only one of the four that can genuinely wait a day.
 */
function urgency(row: WaitingRow, lead: WaitingLead | null): number {
  if (row.kind === "deal" && lead?.state === "proposal") return 0;
  if (row.kind === "follow_up") return 1;
  if (row.kind === "deal") return 2;
  return 3;
}

export function buildWaitingOnYou(params: {
  leads: ReadonlyArray<WaitingLead>;
  /** Prospect projects with no lead — kept so hand-made deals don't vanish. */
  orphanProjects: ReadonlyArray<WaitingProject>;
  now: Date;
  followUpDueDays?: number;
}): WaitingRow[] {
  const dueDays = params.followUpDueDays ?? FOLLOW_UP_DUE_DAYS;
  const rows: { row: WaitingRow; lead: WaitingLead | null }[] = [];

  const sourced = params.leads.filter((l) => l.state === "new");
  if (sourced.length > 0) {
    rows.push({
      row: {
        kind: "sourced",
        id: "sourced",
        label: `${sourced.length} sourced ${sourced.length === 1 ? "prospect" : "prospects"} to triage`,
        detail: sourced
          .slice(0, 3)
          .map((l) => l.companyName)
          .join(" · "),
        href: "/projects",
        count: sourced.length,
      },
      lead: null,
    });
  }

  for (const lead of params.leads) {
    if (lead.state === "contacted") {
      // Contacted and quiet: the aging clock. Never written to at all still counts —
      // the stage says you made contact, so something is owed either way.
      const since = lead.lastSentAt ?? null;
      const agedDays = since ? Math.floor((params.now.getTime() - since.getTime()) / DAY_MS) : null;
      if (agedDays === null || agedDays >= dueDays) {
        rows.push({
          row: {
            kind: "follow_up",
            id: lead.id,
            label: lead.companyName,
            detail:
              agedDays === null ? "contacted — nothing sent yet" : `${agedDays}d since you wrote`,
            ...(agedDays === null ? {} : { agedDays }),
            href: "/projects",
          },
          lead,
        });
      }
      continue;
    }

    if (lead.state === "engaged" || lead.state === "proposal") {
      rows.push({
        row: {
          kind: "deal",
          id: lead.id,
          label: lead.companyName,
          detail: lead.state === "proposal" ? "proposal out" : "in conversation",
          href: lead.projectId ? `/projects/${lead.projectId}` : "/projects",
        },
        lead,
      });
    }
  }

  for (const project of params.orphanProjects) {
    rows.push({
      row: {
        kind: "deal",
        id: project.id,
        label: project.name,
        detail: project.clientName ?? "prospect",
        href: `/projects/${project.id}`,
      },
      lead: null,
    });
  }

  return rows
    .sort((a, b) => {
      const byUrgency = urgency(a.row, a.lead) - urgency(b.row, b.lead);
      if (byUrgency !== 0) return byUrgency;
      // Within follow-ups, the one you have owed longest goes first; a lead never
      // written to at all sorts above every aged one.
      const aAged = a.row.kind === "follow_up" ? (a.row.agedDays ?? Number.MAX_SAFE_INTEGER) : 0;
      const bAged = b.row.kind === "follow_up" ? (b.row.agedDays ?? Number.MAX_SAFE_INTEGER) : 0;
      if (aAged !== bAged) return bAged - aAged;
      return a.row.label.localeCompare(b.row.label);
    })
    .map((r) => r.row);
}
