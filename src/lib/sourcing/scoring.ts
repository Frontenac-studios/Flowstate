import { z } from "zod";

import type { SourcingSegment, SourcingWeights } from "./types";

/**
 * The structured shape the scoring brain returns (W10c). Fed to the AI SDK's
 * `generateObject` so the model can't drift off-format. Mirrors `LeadRationale`.
 *
 * Two numbers, deliberately separate (walk-through T1): `score` is "how good" and is
 * moved ONLY by confirmable Fit/Risk/Strategy facts; `confidence` is "how sure" and
 * reflects data coverage — missing data lowers confidence, never the score, and the
 * gap is named.
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
    risk: facetSchema,
    strategy: facetSchema,
    gaps: z.array(z.string()).max(8),
  }),
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

export type ScoringInputs = {
  companyName: string;
  /** Whatever facts the user pasted / the agent gathered (web research is W10h). */
  companyNotes: string;
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
 * Encodes T1: only Fit/Risk/Strategy move the score; the Direction is a hard gate;
 * won clients are similarity anchors; unconfirmable data lowers confidence + a gap.
 */
export function buildScoringPrompt(inputs: ScoringInputs): { system: string; prompt: string } {
  const system = [
    "You score outbound sales prospects for a solo B2B services consultant.",
    "Return two independent numbers:",
    "- score (0-100): how good a fit, moved ONLY by facts you can confirm from the company info given.",
    "- confidence (0-100): how sure you are, i.e. the share of the scoring factors the info actually covers. Missing data LOWERS confidence and is named in `gaps` — it must NEVER change the score.",
    "The score has two halves of equal weight: similarity to the won clients, and the explicit criteria (Fit, Risk, Strategy).",
    `Explicit weighting — Fit ${inputs.weights.fit}, Risk ${inputs.weights.risk}, Strategy ${inputs.weights.strategy} (relative).`,
    "Fit = target industry / work type / size-stage band / rate plausibility. Risk = bought this kind of work before / budget signal / clear scope. Strategy = case-study potential / builds a roadmap capability.",
    "The Direction is a HARD GATE: a prospect that violates it scores low on Fit regardless of everything else.",
    "Be terse and concrete in reasons; do not invent facts not present in the company info.",
  ].join("\n");

  const prompt = [
    `# Direction (hard gate)\n${inputs.directions.join("\n") || "(none set)"}`,
    `# Won clients (similarity anchors)\n${inputs.wonClientNames.join(", ") || "(none)"}`,
    `# Rate floor\n${inputs.rateFloorCents != null ? `$${Math.round(inputs.rateFloorCents / 100)}/hr` : "(unset)"}`,
    `# ICP segments\n${inputs.segments.map((s) => `- ${s.label}: ${s.firmographics}`).join("\n") || "(none)"}`,
    `# Exclusions (never pursue)\n${inputs.exclusions.join("; ") || "(none)"}`,
    `# Company to score\n${inputs.companyName}\n${inputs.companyNotes || "(no additional info provided)"}`,
  ].join("\n\n");

  return { system, prompt };
}

export type RankableLead = { id: string; score: number | null; confidence: number | null };

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
 * `adjusted = score * (0.5 + 0.5 * confidence/100)` — confidence scales, never erases.
 * Pure; unscored leads (null score) sink to the bottom, order stable by id.
 */
export function rankLeads(leads: ReadonlyArray<RankableLead>): RankedLead[] {
  const adjusted = (l: RankableLead) =>
    l.score == null ? -1 : l.score * (0.5 + 0.5 * ((l.confidence ?? 0) / 100));

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
