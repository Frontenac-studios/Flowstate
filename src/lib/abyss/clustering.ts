import { cosineSimilarity } from "@/lib/tasks/category-classifier";

/**
 * Embedding clustering for the Abyss (§7A). Groups items by cosine similarity to surface
 * *emerging patterns* — recurring un-tagged themes worth naming (which creates a tag) —
 * and, later, Sky constellations. Pure and unit-tested; deterministic in input order.
 */

export interface ClusterableItem {
  id: string;
  embedding: number[] | null;
}

export interface EmbeddingCluster {
  ids: string[];
  /** Mean pairwise cosine within the cluster (cohesion), for ranking. */
  cohesion: number;
}

/**
 * Cosine at/above which two items link into the same cluster. Tuned to MiniLM's modest
 * similarities for short, differently-worded titles (genuinely-related backburner notes
 * land around 0.5–0.7, not 0.8+); higher bars leave obvious themes un-clustered.
 */
export const CLUSTER_THRESHOLD = 0.5;
/** Clusters smaller than this aren't a "pattern" worth surfacing. */
export const MIN_CLUSTER_SIZE = 3;

/**
 * Single-link agglomerative clustering: items within `threshold` cosine of any cluster
 * member join it (union-find). Only embedded items participate; clusters below `minSize`
 * are dropped. Returned strongest-first (larger, then more cohesive).
 */
export function clusterByEmbedding(
  items: readonly ClusterableItem[],
  options?: { threshold?: number; minSize?: number }
): EmbeddingCluster[] {
  const threshold = options?.threshold ?? CLUSTER_THRESHOLD;
  const minSize = options?.minSize ?? MIN_CLUSTER_SIZE;

  const points = items.filter(
    (item): item is { id: string; embedding: number[] } =>
      Array.isArray(item.embedding) && item.embedding.length > 0
  );
  const n = points.length;
  if (n === 0) return [];

  const parent = points.map((_, i) => i);
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const sim: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = cosineSimilarity(points[i].embedding, points[j].embedding);
      sim[i][j] = s;
      sim[j][i] = s;
      if (s >= threshold) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(i);
    else groups.set(root, [i]);
  }

  const clusters: EmbeddingCluster[] = [];
  for (const idxs of Array.from(groups.values())) {
    if (idxs.length < minSize) continue;
    let sum = 0;
    let count = 0;
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        sum += sim[idxs[a]][idxs[b]];
        count++;
      }
    }
    clusters.push({ ids: idxs.map((i) => points[i].id), cohesion: count ? sum / count : 1 });
  }

  clusters.sort((a, b) => b.ids.length - a.ids.length || b.cohesion - a.cohesion);
  return clusters;
}

/** The single strongest cluster (for the emerging-pattern card), or null if none qualify. */
export function selectEmergingCluster(
  items: readonly ClusterableItem[],
  options?: { threshold?: number; minSize?: number }
): EmbeddingCluster | null {
  return clusterByEmbedding(items, options)[0] ?? null;
}
