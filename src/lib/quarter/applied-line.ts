/**
 * W10g — the Direction's applied line. A Direction is **applied, never measured**
 * (discovery-quarter.md §2): the only thing beneath the statement is a count of what
 * the Filter did WITH the rule, never a measure of the rule itself.
 *
 * Raw counts, deliberately no rate (§11 Q7) — a decline rate implies a target, and
 * the moment a Direction has a target it has become a bet.
 */

export type AppliedCounts = { scored: number; declined: number };

/**
 * The line as prose. A true zero says so plainly rather than dressing itself up:
 * "nothing scored against this yet" is information — it means the rule hasn't had to
 * do any work this quarter.
 */
export function formatAppliedLine(counts: AppliedCounts): string {
  if (counts.scored === 0 && counts.declined === 0) {
    return "No leads scored against this yet this quarter.";
  }

  const leads = counts.scored === 1 ? "lead" : "leads";
  const parts = [`Scored ${counts.scored} ${leads} this quarter`];
  if (counts.declined > 0) parts.push(`${counts.declined} declined on this basis`);
  parts.push("feeds the Filter");
  return `${parts.join(" · ")}.`;
}
