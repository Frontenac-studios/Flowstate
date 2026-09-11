/**
 * Ordering for search results (W17e).
 *
 * Kept out of the router on purpose: this is the part with judgment in it, and
 * judgment deserves tests. The database's job is to hand back everything that
 * matches; this decides what you see first.
 *
 * The order encodes three beliefs, strongest first:
 *   1. Where the match landed. A title that *starts* with what you typed is
 *      almost always the thing you meant; a match buried in a note rarely is.
 *   2. Whether the thing is still live. A completed task outranking an open one
 *      would make search feel like an archive.
 *   3. Recency, only as a tiebreak between otherwise equal matches.
 */

export type SearchKind = "task" | "backlog" | "project" | "client";

/** Which field the query hit. The single biggest input to the ordering. */
export type MatchField = "title" | "body";

export type RankableResult = {
  id: string;
  kind: SearchKind;
  title: string;
  /** The note or body text that matched, when the title didn't. */
  snippet?: string | null;
  matchField: MatchField;
  /** Completed, archived, or otherwise no longer live. */
  done: boolean;
  /** Last meaningful activity, for the tiebreak. */
  updatedAt: Date;
};

/**
 * Score bands, far enough apart that a lower band can never climb over a higher
 * one on a tiebreak. Read them as "how likely is this the thing you were
 * reaching for".
 */
const BAND = {
  titleExact: 1000,
  titlePrefix: 800,
  titleWordPrefix: 600,
  titleContains: 400,
  bodyContains: 150,
} as const;

/** Completed and archived rows are demoted, never hidden — "did I already do that?" is a real question. */
const DONE_PENALTY = 200;

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchBand(title: string, query: string, matchField: MatchField): number {
  if (matchField === "body") return BAND.bodyContains;

  const haystack = title.toLowerCase();
  if (haystack === query) return BAND.titleExact;
  if (haystack.startsWith(query)) return BAND.titlePrefix;
  // "invoice" should rank high against "Send the invoice to Dani", where the
  // word starts a token even though the title doesn't start with it.
  if (haystack.split(/\s+/).some((word) => word.startsWith(query))) return BAND.titleWordPrefix;
  if (haystack.includes(query)) return BAND.titleContains;
  return BAND.bodyContains;
}

export function scoreResult(result: RankableResult, query: string): number {
  const band = matchBand(result.title, query, result.matchField);
  return result.done ? band - DONE_PENALTY : band;
}

/**
 * Order results and cut to `limit`. Ties break on recency, then on title, so the
 * same query always returns the same order — a list that reshuffles between
 * keystrokes is a list you can't aim at.
 */
export function rankResults<T extends RankableResult>(
  results: T[],
  rawQuery: string,
  limit?: number
): T[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const ranked = [...results].sort((a, b) => {
    const byScore = scoreResult(b, query) - scoreResult(a, query);
    if (byScore !== 0) return byScore;

    const byRecency = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (byRecency !== 0) return byRecency;

    return a.title.localeCompare(b.title);
  });

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
