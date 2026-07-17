export type ProjectRef = { slug: string; name: string };

/** Strip leading `#` / whitespace so chat tool inputs match stored slugs. */
export function normalizeProjectSlugInput(slug: string): string {
  return slug.trim().replace(/^#+/, "").toLowerCase();
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

function scoreMatch(query: string, project: ProjectRef): number {
  const q = normalizeProjectSlugInput(query);
  const slug = project.slug.toLowerCase();
  const name = project.name.toLowerCase();

  if (slug === q || name === q) return 0;
  if (slug.startsWith(q) || name.startsWith(q)) return 1;
  if (slug.includes(q) || name.includes(q)) return 2;

  const dist = Math.min(levenshtein(q, slug), levenshtein(q, name));
  return 3 + dist;
}

export type ProjectSuggestion = {
  slug: string;
  name: string;
  score: number;
};

export function fuzzyProjectSuggestions(
  slug: string,
  projects: ProjectRef[],
  limit = 3
): ProjectSuggestion[] {
  if (!slug.trim()) return [];

  return projects
    .map((p) => ({ slug: p.slug, name: p.name, score: scoreMatch(slug, p) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

export function findProjectBySlug(slug: string, projects: ProjectRef[]): ProjectRef | null {
  const key = normalizeProjectSlugInput(slug);
  if (!key) return null;
  return projects.find((p) => p.slug.toLowerCase() === key) ?? null;
}
