/**
 * Rate resolution — the one place the "project rate beats client rate" ladder
 * lives (W1, docs/v1-scope.md). Every downstream number (invoices, effective
 * rate) reads a rate through this function, never by picking a row itself.
 *
 * The ladder:
 *   1. project rate  — a rate row scoped to this exact project wins.
 *   2. client rate   — otherwise the client's default rate (projectId null).
 *   3. error         — a project with no resolvable rate is a bug to surface, not
 *                      a zero to bill. `RateNotFoundError` is explicit on purpose.
 *
 * Within a scope, the most recent already-effective rate wins, so a rate change
 * over time keeps its history. Amounts are integer cents throughout.
 */

export type CandidateRate = {
  /** Null = the client's default rate; set = scoped to that project. */
  projectId: string | null;
  amountCents: number;
  effectiveFrom: Date;
};

export class RateNotFoundError extends Error {
  constructor(projectId: string) {
    super(`No rate resolves for project ${projectId}: set a project or client rate first.`);
    this.name = "RateNotFoundError";
  }
}

/**
 * @param projectId the project a rate is wanted for.
 * @param rates every rate belonging to that project's client (both the client's
 *   default rows and any project-scoped rows). Rows for other clients must not be
 *   passed in — the caller scopes the query by client.
 * @param asOf resolution instant; rates effective in the future are ignored.
 * @throws RateNotFoundError when neither a project nor a client rate applies.
 */
export function resolveRateCents(
  projectId: string,
  rates: readonly CandidateRate[],
  asOf: Date = new Date()
): number {
  const effective = rates.filter((rate) => rate.effectiveFrom.getTime() <= asOf.getTime());

  const projectRate = mostRecent(effective.filter((rate) => rate.projectId === projectId));
  if (projectRate) return projectRate.amountCents;

  const clientRate = mostRecent(effective.filter((rate) => rate.projectId === null));
  if (clientRate) return clientRate.amountCents;

  throw new RateNotFoundError(projectId);
}

function mostRecent(rates: CandidateRate[]): CandidateRate | undefined {
  return rates.reduce<CandidateRate | undefined>((best, rate) => {
    if (!best || rate.effectiveFrom.getTime() > best.effectiveFrom.getTime()) return rate;
    return best;
  }, undefined);
}
