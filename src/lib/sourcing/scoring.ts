import { z } from "zod";

import { rolloverDecay } from "./run";
import type { SourcingSegment, SourcingWeights } from "./types";

/**
 * The structured shape the scoring brain returns (W10c). Fed to the AI SDK's
 * `generateObject` so the model can't drift off-format. Mirrors `LeadRationale`.
 *
 * Fact-based rule (walk-through T4): the agent gathers facts and scores them against
 * the parameters you set — it never makes the judgment call. Two numbers, deliberately
 * separate: `score` is "do the facts fit" and is moved ONLY by the fact-based facets
 * Fit/Need/Value; `confidence` is "how sure" and reflects data coverage — missing or
 * inferred data lowers confidence, never the score, and the gap is named. Judgment
 * items (do-I-want-them, strategy, case-study value) are surfaced in `judgment[]` for
 * the human to weigh and are never scored.
 */
const facetSchema = z.object({
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()).max(6),
});

export const scoreResultSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  rationale: z.object({
    fit: facetSchema,
    need: facetSchema,
    value: facetSchema,
    /** Surfaced for the human, never scored — the judgment the agent must not make. */
    judgment: z.array(z.string()).max(6),
    gaps: z.array(z.string()).max(8),
  }),
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

export type ScoringInputs = {
  companyName: string;
  /** Whatever the OWNER typed about this company. */
  companyNotes: string;
  /**
   * What the web said, rendered by `renderFactsForScoring` (W10h). Kept separate from
   * `companyNotes` so the prompt can rank them: the owner knows things the web does
   * not, so on a conflict the owner's note wins.
   */
  researchedFacts?: string | null;
  segments: SourcingSegment[];
  weights: SourcingWeights;
  exclusions: string[];
  /** Active Direction statements — the hard gate for what work is taken. */
  directions: string[];
  /** Won-client names — the positive examples half the score leans on. */
  wonClientNames: string[];
  rateFloorCents: number | null;
};

/**
 * Build the scoring prompt. Pure, so the rubric is unit-testable without a model.
 * Encodes T4: the agent gathers FACTS and scores them against the parameters set — it
 * never makes the judgment call. Only the fact-based facets Fit/Need/Value move the
 * score; Direction, region, and revenue band are hard gates; won clients are
 * similarity anchors; inferred or unconfirmable data lowers confidence, not the score;
 * judgment items are surfaced for the human, never scored.
 */
export function buildScoringPrompt(inputs: ScoringInputs): { system: string; prompt: string } {
  const { weights } = inputs;
  const system = [
    "You score outbound sales prospects for a solo consultant who sells AI-enabled workflows, real-time business insights, and financial dashboards to mid-market companies ($10M–$200M revenue).",
    "THE RULE: you gather facts and score them against the parameters given. You NEVER make the judgment call — that is the human's. Do not invent facts.",
    "Return two independent numbers:",
    "- score (0-100): do the facts fit the parameters. Moved ONLY by facts you can confirm or defensibly infer from the company info.",
    "- confidence (0-100): how sure you are, i.e. the share of the scoring factors actually confirmed vs inferred or missing. Missing or inferred data LOWERS confidence and is named in `gaps` — it must NEVER change the score.",
    `The score has two halves: ${weights.wonSimilarity}% similarity to the won clients, and ${weights.explicit}% the explicit criteria (Fit, Need, Value).`,
    `Explicit split — Fit ${weights.fit}, Need ${weights.need}, Value ${weights.value} (relative).`,
    "Fit = firmographic match to the ICP: industry / offering, revenue band, headcount & sites, region, market tier, ownership type.",
    "Need = signals they need the work: hiring ops / analyst / data roles, manual reporting or no live dashboards, recent growth (a new site, an acquisition, a system change).",
    "Value = willingness-to-pay vs the rate floor. WTP is rarely public — INFER it from the margins of comparable companies in the same tier (luxury↔luxury, mid-market↔mid-market), mark that reason as inferred, and let it lower confidence rather than faking certainty.",
    "HARD GATES — a prospect outside any of these scores near-zero on Fit regardless of everything else: the Direction, the region / time zone, and the revenue band in the ICP.",
    "JUDGMENT — surface (do NOT score) in `judgment`: whether these are people worth working with, strategic or case-study value, and whether it builds a capability. These are the human's call; they must never move the score.",
    "Be terse and concrete in reasons; where a fact is inferred, say so.",
    "Two kinds of company info may be given. What the OWNER says is first-hand and wins any conflict; what the WEB RESEARCH says is second-hand — trust it, but treat anything it lists as unconfirmed as a gap, not a fact.",
  ].join("\n");

  const prompt = [
    `# Direction (hard gate)\n${inputs.directions.join("\n") || "(none set)"}`,
    `# Won clients (similarity anchors)\n${inputs.wonClientNames.join(", ") || "(none)"}`,
    `# Rate floor\n${inputs.rateFloorCents != null ? `$${Math.round(inputs.rateFloorCents / 100)}/hr` : "(unset)"}`,
    `# ICP segments\n${inputs.segments.map((s) => `- ${s.label}: ${s.firmographics}`).join("\n") || "(none)"}`,
    `# Exclusions (never pursue)\n${inputs.exclusions.join("; ") || "(none)"}`,
    `# Company to score\n${inputs.companyName}`,
    `## What the owner says\n${inputs.companyNotes || "(nothing noted)"}`,
    `## What web research found\n${inputs.researchedFacts || "(not researched — treat every scoring factor it would have covered as a gap)"}`,
  ].join("\n\n");

  return { system, prompt };
}

export type RankableLead = {
  id: string;
  score: number | null;
  confidence: number | null;
  /**
   * W10i rollover: how long this prospect has sat untriaged. A prospect nobody got to
   * keeps its score but slowly loses priority, so a stale board can't out-rank what
   * the agent found this morning. Omit it and nothing decays.
   */
  ageDays?: number;
};

export type RankedLead = {
  id: string;
  rank: number;
  /** High score but thin confidence — surfaced with a callout so gems aren't buried. */
  highPotentialUnverified: boolean;
};

/** A high-but-unverified lead: strong score, weak confidence. */
const HIGH_SCORE = 70;
const LOW_CONFIDENCE = 50;

/**
 * Rank leads confidence-adjusted so verified prospects float up, without burying a
 * high-score/low-confidence gem (it still ranks on a blend and gets a callout).
 * `adjusted = score * (0.5 + 0.5 * confidence/100) * rolloverDecay(ageDays)` —
 * confidence scales, never erases; age slips a stale prospect down, never off.
 * Pure; unscored leads (null score) sink to the bottom, order stable by id.
 */
export function rankLeads(leads: ReadonlyArray<RankableLead>): RankedLead[] {
  const adjusted = (l: RankableLead) =>
    l.score == null
      ? -1
      : l.score *
        (0.5 + 0.5 * ((l.confidence ?? 0) / 100)) *
        (l.ageDays == null ? 1 : rolloverDecay(l.ageDays));

  return [...leads]
    .sort((a, b) => {
      const d = adjusted(b) - adjusted(a);
      return d !== 0 ? d : a.id.localeCompare(b.id);
    })
    .map((l, i) => ({
      id: l.id,
      rank: i + 1,
      highPotentialUnverified:
        l.score != null && l.score >= HIGH_SCORE && (l.confidence ?? 0) < LOW_CONFIDENCE,
    }));
}
