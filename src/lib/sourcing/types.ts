/**
 * Shared jsonb shapes for the outbound sourcing agent (W10). Kept in `src/lib`
 * (framework-free) so both the Drizzle `$type<>()` column annotations and the
 * server/UI code import one definition. The scoring brain (W10c) refines
 * `LeadRationale`; the ICP config (W10b) fills `SourcingSettingsConfig`.
 */

/** One lever of the score, with the reasons that moved it. */
export type ScoreFacet = {
  /** This facet's sub-score (0–100). */
  score: number;
  /** Human-readable reasons, shown on the prospect card. */
  reasons: string[];
};

/**
 * Why a lead scored the way it did. Only Fit/Risk/Strategy move the 0–100 score;
 * `gaps` are the "couldn't confirm X" notes that lower *confidence*, never score.
 */
export type LeadRationale = {
  fit?: ScoreFacet;
  risk?: ScoreFacet;
  strategy?: ScoreFacet;
  /** Data the agent couldn't confirm — lowers confidence, names the gap. */
  gaps?: string[];
};

/** One ICP profile. Firmographics are free-form so the agent can match loosely. */
export type SourcingSegment = {
  id: string;
  label: string;
  /** Free-text firmographics: industry, size/stage band, geography, etc. */
  firmographics: string;
};

/** The weighting the scoring brain applies. Tunable in the weights panel (W10b). */
export type SourcingWeights = {
  /** Won-client similarity vs explicit criteria (each 0–100, sum 100). */
  wonSimilarity: number;
  explicit: number;
  /** Within the explicit half, Fit/Risk/Strategy split (0–100, sum 100). */
  fit: number;
  risk: number;
  strategy: number;
};

/** The single editable outreach-voice profile the drafter mirrors (W10e). */
export type OutreachVoice = {
  warmth: "warm" | "professional" | "formal";
  length: "short" | "medium";
  signature: string;
  /** Cite an analogous won client in the opener. */
  citeAnalogousClient: boolean;
  /** Free-text sample the agent mirrors for cadence/phrasing. */
  voiceSample: string;
};
