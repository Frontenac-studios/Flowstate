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
 * Why a lead scored the way it did. Only the fact-based facets Fit/Need/Value move the
 * 0–100 score; `judgment` notes are surfaced for the human to weigh but never scored;
 * `gaps` are the "couldn't confirm X" notes that lower *confidence*, never score.
 */
export type LeadRationale = {
  fit?: ScoreFacet;
  need?: ScoreFacet;
  value?: ScoreFacet;
  /**
   * Judgments the agent surfaces but must NEVER score — do-I-want-them, strategic /
   * case-study value, capability fit. A brief you read; the call stays yours.
   */
  judgment?: string[];
  /** Data the agent couldn't confirm — lowers confidence, names the gap. */
  gaps?: string[];
};

/**
 * How hard the agent tries to close a company's data gaps (W10j).
 *
 * `off` — take what the research pass found and let the gaps stand.
 * `web` — spend one extra targeted search on the specific facts that came back
 *   unconfirmed. The only mode v1 ships.
 *
 * A paid data vendor would arrive as a third mode here and nowhere else — that is
 * the whole point of the enum being on the SEGMENT rather than global. You would
 * turn a vendor on for the one segment whose confidence is chronically low, not for
 * all your sourcing at once.
 */
export type EnrichmentMode = "off" | "web";

/**
 * One ICP profile. Firmographics are free-form today so the agent can match loosely;
 * the fact-based rework reads region / revenue band / market tier out of this text.
 * TODO(W10): promote firmographics to structured fields (industries, revenue band,
 * headcount, regions, market tiers, ownership) so scoring is a real parametric match
 * and the region gate is enforced structurally — a follow-up (touches the ICP config UI).
 */
export type SourcingSegment = {
  id: string;
  label: string;
  /** Free-text firmographics: industry, revenue/size band, region, market tier, etc. */
  firmographics: string;
  /** Gap-filling for this segment. Undefined = "off" (the default costs nothing). */
  enrichment?: EnrichmentMode;
};

/** The weighting the scoring brain applies. Tunable in the weights panel (W10b). */
export type SourcingWeights = {
  /** Won-client similarity vs explicit criteria (each 0–100, sum 100). */
  wonSimilarity: number;
  explicit: number;
  /** Within the explicit half, the fact-based Fit/Need/Value split (0–100, sum 100). */
  fit: number;
  need: number;
  value: number;
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
