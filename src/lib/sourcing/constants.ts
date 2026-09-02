import type { OutreachVoice, SourcingWeights } from "./types";

/**
 * Default scoring weights (W10, walk-through thread T1): the score is half
 * won-client similarity, half explicit criteria; within the explicit half, Fit
 * leads because it's the most web-observable. All tunable in the weights panel.
 */
export const DEFAULT_WEIGHTS: SourcingWeights = {
  wonSimilarity: 50,
  explicit: 50,
  fit: 40,
  risk: 30,
  strategy: 30,
};

/** A neutral starting voice; the user edits it (W10e mirrors the sample). */
export const DEFAULT_VOICE: OutreachVoice = {
  warmth: "professional",
  length: "short",
  signature: "",
  citeAnalogousClient: true,
  voiceSample: "",
};
