/**
 * W10f — the deal pipeline. This module is the single authority on what the stages
 * are and what "forward" means; the router and the board both defer to it, so the
 * funnel's shape is stated once and tested in isolation.
 *
 * The five open stages are the funnel. A deal closes into exactly one of three
 * terminal stages, and **the stage is the close reason** — `signed` (won),
 * `declined` (they said no), `lost` (went dark, or lost it to someone else). No
 * separate reason column: a second field would only be able to disagree with this
 * one.
 *
 * Two facts that live elsewhere, deliberately:
 *  - **Promotion.** A lead at `contacted` or beyond has a `state='prospect'`
 *    project, and `leads.projectId` records it. `promotesAt` below is the rule, but
 *    the project link is the fact — so a stage change can never leave the app
 *    believing in a promotion that didn't happen.
 *  - **Money.** A proposal amount never appears here or on the lead; it lives in
 *    `project_fees` (financial-class). This file counts deals, never dollars.
 */

/** The open funnel, in order. Index is the stage's depth. */
export const PIPELINE_STAGES = ["new", "contacted", "engaged", "proposal", "signed"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** The three ways a deal ends. `signed` is both the last stage and a closed one. */
export const CLOSED_STAGES = ["signed", "declined", "lost"] as const;

export type ClosedStage = (typeof CLOSED_STAGES)[number];

/** Every state the pipeline board reads — open stages only. */
export const OPEN_STAGES = ["new", "contacted", "engaged", "proposal"] as const;

export type OpenStage = (typeof OPEN_STAGES)[number];

/**
 * What the user sees. "Sourced" rather than "New" because the stage describes how
 * the lead arrived, not how recently — a lead the weekly run found last month is
 * still Sourced until someone contacts it.
 */
export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "Sourced",
  contacted: "Contacted",
  engaged: "Engaged",
  proposal: "Proposal",
  signed: "Signed",
};

export const CLOSED_LABELS: Record<ClosedStage, string> = {
  signed: "Signed",
  declined: "Declined",
  lost: "Lost",
};

/**
 * The stage at which a lead earns a prospect project: first real contact. Anything
 * at or past this depth must have one — `stagePromotes` is the check the router runs
 * before it writes.
 */
export const PROMOTES_AT: PipelineStage = "contacted";

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(value);
}

export function isClosedStage(value: string): value is ClosedStage {
  return (CLOSED_STAGES as readonly string[]).includes(value);
}

export function isOpenStage(value: string): value is OpenStage {
  return (OPEN_STAGES as readonly string[]).includes(value);
}

/** Depth in the funnel, or -1 for a state that isn't a stage (dismissed, snoozed, …). */
export function stageDepth(value: string): number {
  return (PIPELINE_STAGES as readonly string[]).indexOf(value);
}

/** True once a lead is deep enough to own a prospect project. */
export function stagePromotes(stage: PipelineStage): boolean {
  return stageDepth(stage) >= stageDepth(PROMOTES_AT);
}

/** The next stage forward, or null at the end of the funnel. */
export function nextStage(stage: PipelineStage): PipelineStage | null {
  const i = stageDepth(stage);
  return i >= 0 && i < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[i + 1] : null;
}

/** The stage behind, or null at the top. */
export function previousStage(stage: PipelineStage): PipelineStage | null {
  const i = stageDepth(stage);
  return i > 0 ? PIPELINE_STAGES[i - 1] : null;
}

/**
 * A proposal figure only makes sense from the Proposal stage on — before that there
 * is nothing quoted, and the input shouldn't be offered.
 */
export function stageTakesProposal(stage: PipelineStage): boolean {
  return stageDepth(stage) >= stageDepth("proposal");
}

export type StagedLead = { id: string; state: string; rank: number };

export type PipelineColumn<T extends StagedLead> = {
  stage: OpenStage;
  label: string;
  leads: T[];
};

/**
 * Group open leads into the board's columns, ranked within each. Every open column
 * is returned even when empty — an empty Proposal column is information ("nothing
 * out for signature"), not a column to hide.
 */
export function groupByStage<T extends StagedLead>(leads: readonly T[]): PipelineColumn<T>[] {
  return OPEN_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    leads: leads.filter((l) => l.state === stage).sort((a, b) => a.rank - b.rank),
  }));
}

export type FunnelCounts = Record<OpenStage, number>;

/** Open deals per stage — the header read, and W10g's Direction applied-line input. */
export function funnelCounts(leads: readonly StagedLead[]): FunnelCounts {
  const counts = { new: 0, contacted: 0, engaged: 0, proposal: 0 } as FunnelCounts;
  for (const lead of leads) {
    if (isOpenStage(lead.state)) counts[lead.state] += 1;
  }
  return counts;
}
