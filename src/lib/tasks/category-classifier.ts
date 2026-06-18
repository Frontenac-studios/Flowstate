import { type ProjectCategory } from "../projects/categories";

import { type CategoryInference } from "./resolveTaskCategory";

// Phase 1 (1H / 1.AIb–c): the pure scoring core of the embeddings nearest-prototype
// classifier. Given a title embedding and one prototype vector per category, it ranks
// categories by cosine similarity, sharpens the scores into a probability distribution
// (softmax with temperature), then gates on floor + margin. No model or async here — the
// embedding is computed elsewhere and injected, so this stays trivially testable.

export interface CategoryPrototype {
  category: ProjectCategory;
  /** The (ideally L2-normalized) prototype embedding for this category. */
  vector: number[];
}

export interface ClassifierConfig {
  // Softmax temperature. Raw cosine for short titles bunches in a narrow band, so we
  // divide by a small T to sharpen the distribution before gating (1.AIc). Lower = sharper.
  temperature: number;
  // 1.AIc floor: the top probability must clear this absolute bar.
  floor: number;
  // 1.AIc margin: the top must beat the runner-up by at least this much.
  margin: number;
}

// Defaults per the §7 decisions (floor ≈0.70, margin ≈0.10). Temperature is the knob that
// makes a floor on a *normalized* probability meaningful; all three are tunable and expected
// to be re-checked empirically against the real model's score distribution.
export const DEFAULT_CLASSIFIER_CONFIG: ClassifierConfig = {
  temperature: 0.1,
  floor: 0.7,
  margin: 0.1,
};

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Numerically-stable softmax of `values / temperature`.
export function softmax(values: readonly number[], temperature: number): number[] {
  if (values.length === 0) return [];
  const t = temperature > 0 ? temperature : 1;
  const scaled = values.map((v) => v / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const sum = exps.reduce((acc, v) => acc + v, 0);
  if (sum === 0) return values.map(() => 1 / values.length);
  return exps.map((v) => v / sum);
}

// Rank prototypes against the query embedding and return a confident pick, or null when
// the gate isn't met (the resolver then falls through to last-used / unresolved).
export function classifyEmbedding(
  queryVector: readonly number[],
  prototypes: readonly CategoryPrototype[],
  config: ClassifierConfig = DEFAULT_CLASSIFIER_CONFIG
): CategoryInference | null {
  if (queryVector.length === 0 || prototypes.length === 0) return null;

  const sims = prototypes.map((p) => cosineSimilarity(queryVector, p.vector));
  const probs = softmax(sims, config.temperature);

  let topIdx = 0;
  for (let i = 1; i < probs.length; i += 1) {
    if (probs[i] > probs[topIdx]) topIdx = i;
  }

  const top = probs[topIdx];
  const runnerUp = probs.reduce((best, p, i) => (i === topIdx ? best : Math.max(best, p)), 0);

  if (top < config.floor) return null;
  if (top - runnerUp < config.margin) return null;

  return { category: prototypes[topIdx].category, confidence: top };
}
