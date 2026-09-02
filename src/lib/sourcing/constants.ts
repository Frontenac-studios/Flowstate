import type { OutreachVoice, SourcingWeights } from "./types";

/**
 * Default scoring weights (W10, walk-through thread T4): the score is half won-client
 * similarity, half explicit criteria; within the explicit half, the fact-based facets
 * Fit (firmographic match) / Need (buying signals) / Value (inferred WTP vs rate), Fit
 * leading because it's the most reliably observable. All tunable in the weights panel.
 */
export const DEFAULT_WEIGHTS: SourcingWeights = {
  wonSimilarity: 50,
  explicit: 50,
  fit: 40,
  need: 30,
  value: 30,
};

/** A neutral starting voice; the user edits it (W10e mirrors the sample). */
export const DEFAULT_VOICE: OutreachVoice = {
  warmth: "professional",
  length: "short",
  signature: "",
  citeAnalogousClient: true,
  voiceSample: "",
};
