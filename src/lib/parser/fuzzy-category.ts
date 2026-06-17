import {
  PROJECT_CATEGORIES,
  PROJECT_CATEGORY_META,
  type ProjectCategory,
} from "@/lib/projects/categories";

// Phase 1 (1.4b / 1.5): match a semicolon segment against the five category names.
// Labels are user-overridable (category_settings); callers can pass their own label
// map, defaulting to the seed labels in PROJECT_CATEGORY_META.
export type CategoryLabels = Record<ProjectCategory, string>;

export function defaultCategoryLabels(): CategoryLabels {
  return Object.fromEntries(
    PROJECT_CATEGORIES.map((c) => [c, PROJECT_CATEGORY_META[c].label])
  ) as CategoryLabels;
}

// Fold to a comparable form: lowercase, "&" → "and", non-alphanumerics → spaces.
// So "Body & Mind", "body and mind", and the key "health_wellness" all converge.
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function candidates(category: ProjectCategory, labels: CategoryLabels): string[] {
  return [normalize(labels[category]), normalize(category)];
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function scoreCategory(query: string, category: ProjectCategory, labels: CategoryLabels): number {
  const q = normalize(query);
  let best = Infinity;
  for (const c of candidates(category, labels)) {
    if (c === q) return 0;
    if (c.startsWith(q)) best = Math.min(best, 1);
    else if (c.includes(q)) best = Math.min(best, 2);
    else best = Math.min(best, 3 + levenshtein(q, c));
  }
  return best;
}

// Exact (normalized) match only — used by the parser so an arbitrary word never gets
// swallowed as a category. A segment counts as a category iff it equals a key or label.
export function matchCategorySegment(
  segment: string,
  labels: CategoryLabels = defaultCategoryLabels()
): ProjectCategory | null {
  const q = normalize(segment);
  if (!q) return null;
  return PROJECT_CATEGORIES.find((c) => candidates(c, labels).includes(q)) ?? null;
}

export type CategorySuggestion = {
  category: ProjectCategory;
  label: string;
  score: number;
};

// Ranked matches for autocomplete (the `;` category segment).
export function fuzzyCategorySuggestions(
  query: string,
  labels: CategoryLabels = defaultCategoryLabels(),
  limit = 5
): CategorySuggestion[] {
  if (!query.trim()) {
    return PROJECT_CATEGORIES.map((c) => ({ category: c, label: labels[c], score: 0 })).slice(
      0,
      limit
    );
  }
  return PROJECT_CATEGORIES.map((c) => ({
    category: c,
    label: labels[c],
    score: scoreCategory(query, c, labels),
  }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
