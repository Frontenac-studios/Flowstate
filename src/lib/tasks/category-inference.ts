import { PROJECT_CATEGORIES, type ProjectCategory } from "../projects/categories";

import { type CategoryPrototype, classifyEmbedding } from "./category-classifier";
import { prototypeTitlePairs } from "./category-prototypes";
import { embedText, warmEmbedder } from "./embed-text";
import { type CategoryInference } from "./resolveTaskCategory";

// Phase 1 (1H / 1.AIb): the isomorphic inference provider. Embeds the seed titles once
// into one mean prototype vector per category (cached), then classifies a title against
// them. Used behind the resolver's layer-3 seam on the server and directly by the live
// composer. Errors are swallowed to `null` — an error means "no opinion", never a throw.

/** Component-wise mean of equal-length vectors, re-normalized to a unit vector. */
function meanUnitVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dims = vectors[0].length;
  const sum = new Array<number>(dims).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dims; i += 1) sum[i] += vec[i];
  }
  let norm = 0;
  for (let i = 0; i < dims; i += 1) {
    sum[i] /= vectors.length;
    norm += sum[i] * sum[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return sum;
  return sum.map((v) => v / norm);
}

let prototypesPromise: Promise<CategoryPrototype[]> | null = null;

async function buildPrototypes(): Promise<CategoryPrototype[]> {
  const byCategory = new Map<ProjectCategory, number[][]>();
  for (const { category, title } of prototypeTitlePairs()) {
    const vec = await embedText(title);
    if (vec.length === 0) continue;
    const list = byCategory.get(category) ?? [];
    list.push(vec);
    byCategory.set(category, list);
  }
  return PROJECT_CATEGORIES.map((category) => ({
    category,
    vector: meanUnitVector(byCategory.get(category) ?? []),
  }));
}

function getPrototypes(): Promise<CategoryPrototype[]> {
  if (!prototypesPromise) prototypesPromise = buildPrototypes();
  return prototypesPromise;
}

/** Layer-3 inference: embed the title, classify against the cached prototypes, gate. */
export async function inferCategory(title: string): Promise<CategoryInference | null> {
  if (!title.trim()) return null;
  try {
    const [vector, prototypes] = await Promise.all([embedText(title), getPrototypes()]);
    return classifyEmbedding(vector, prototypes);
  } catch {
    return null;
  }
}

/** Warm the model + prototype cache so the first real inference is fast. */
export async function warmCategoryInference(): Promise<void> {
  await warmEmbedder();
  await getPrototypes();
}
