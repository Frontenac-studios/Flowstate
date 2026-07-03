import { cosineSimilarity } from "@/lib/tasks/category-classifier";

import type { ProjectCategory } from "./categories";

/**
 * Project similarity (§5 P2 / §9.3). MiniLM name embeddings (Backlog seam) rank past
 * projects; user tags and inferred links both land in `project_similarity`.
 */

/** Cosine floor for auto-inferred links. Related-but-distinct names sit ~0.5–0.7. */
export const PROJECT_SIMILARITY_THRESHOLD = 0.55;

/** Max auto-inferred neighbours stored per project. */
export const MAX_INFERRED_SIMILAR = 3;

/** Soft boost when the candidate shares the query project's category. */
export const SAME_CATEGORY_BOOST = 0.05;

export type ProjectSimilaritySource = "user" | "inferred";

export type SimilarProjectCandidate = {
  id: string;
  name: string;
  category: ProjectCategory;
  embedding: number[] | null;
};

export type RankedSimilarProject = SimilarProjectCandidate & {
  score: number;
  /** True when score clears the inference threshold (before category boost alone). */
  suggested: boolean;
};

/**
 * Rank past projects by name-embedding cosine (plus a small same-category boost).
 * Candidates without embeddings sort last (score 0) so the picker still lists them.
 */
export function rankSimilarProjects(
  queryVector: number[],
  candidates: readonly SimilarProjectCandidate[],
  options?: {
    threshold?: number;
    limit?: number;
    excludeIds?: ReadonlySet<string>;
    preferredCategory?: ProjectCategory | null;
  }
): RankedSimilarProject[] {
  const threshold = options?.threshold ?? PROJECT_SIMILARITY_THRESHOLD;
  const excludeIds = options?.excludeIds;
  const preferredCategory = options?.preferredCategory ?? null;

  const ranked: RankedSimilarProject[] = [];

  for (const candidate of candidates) {
    if (excludeIds?.has(candidate.id)) continue;

    let score = 0;
    if (queryVector.length > 0 && candidate.embedding && candidate.embedding.length > 0) {
      score = cosineSimilarity(queryVector, candidate.embedding);
    }

    if (preferredCategory && candidate.category === preferredCategory) {
      score = Math.min(1, score + SAME_CATEGORY_BOOST);
    }

    ranked.push({
      ...candidate,
      score,
      suggested: score >= threshold,
    });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  const limit = options?.limit;
  return limit != null ? ranked.slice(0, limit) : ranked;
}

/** Candidates that clear the inference threshold, capped. */
export function selectInferredSimilar(
  queryVector: number[],
  candidates: readonly SimilarProjectCandidate[],
  options?: {
    threshold?: number;
    limit?: number;
    excludeIds?: ReadonlySet<string>;
    preferredCategory?: ProjectCategory | null;
  }
): RankedSimilarProject[] {
  const limit = options?.limit ?? MAX_INFERRED_SIMILAR;
  return rankSimilarProjects(queryVector, candidates, options)
    .filter((row) => row.suggested)
    .slice(0, limit);
}

type TemplateRankInput = {
  id: string;
  name: string;
  category: ProjectCategory;
};

/**
 * Prefer templates that match a similar project's name, then same category.
 * Stable for equal rank (original order preserved via index).
 */
export function rankTemplatesBySimilarProjects<T extends TemplateRankInput>(
  templates: readonly T[],
  similarProjects: readonly { name: string; category: ProjectCategory }[]
): T[] {
  if (similarProjects.length === 0) return [...templates];

  const similarNames = new Set(similarProjects.map((p) => p.name.trim().toLowerCase()));
  const similarCategories = new Set(similarProjects.map((p) => p.category));

  return templates
    .map((template, index) => {
      let rank = 0;
      if (similarNames.has(template.name.trim().toLowerCase())) rank += 2;
      if (similarCategories.has(template.category)) rank += 1;
      return { template, rank, index };
    })
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map((row) => row.template);
}
