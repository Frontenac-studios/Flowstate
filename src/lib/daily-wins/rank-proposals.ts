import type { WinCandidate, WinProposal } from "./types";
import { MAX_WIN_PROPOSALS, WIN_PROPOSAL_TIERS } from "./types";

function compareCandidates(a: WinCandidate, b: WinCandidate): number {
  if (a.tier !== b.tier) return a.tier - b.tier;

  if (a.tier === WIN_PROPOSAL_TIERS.top3Done) {
    const orderA = a.top3Order ?? 99;
    const orderB = b.top3Order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
  }

  if (a.tier === WIN_PROPOSAL_TIERS.priorityEffortDone) {
    const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    const effortDelta = (b.effortMinutes ?? 0) - (a.effortMinutes ?? 0);
    if (effortDelta !== 0) return effortDelta;
  }

  return b.occurredAt.getTime() - a.occurredAt.getTime();
}

/** Rank candidates, apply the 1-care-event cap, and return at most 3 proposals. */
export function rankProposals(
  candidates: WinCandidate[],
  options?: {
    dismissedRefIds?: ReadonlySet<string>;
    acceptedRefIds?: ReadonlySet<string>;
    maxProposals?: number;
  }
): WinProposal[] {
  const dismissed = options?.dismissedRefIds ?? new Set<string>();
  const accepted = options?.acceptedRefIds ?? new Set<string>();
  const maxProposals = options?.maxProposals ?? MAX_WIN_PROPOSALS;

  const eligible = candidates.filter((c) => !dismissed.has(c.refId) && !accepted.has(c.refId));
  const sorted = [...eligible].sort(compareCandidates);

  const picked: WinProposal[] = [];
  let careCount = 0;

  for (const candidate of sorted) {
    if (picked.length >= maxProposals) break;
    if (candidate.tier === WIN_PROPOSAL_TIERS.careEvent) {
      if (careCount >= 1) continue;
      careCount += 1;
    }

    picked.push({
      source: candidate.source,
      refId: candidate.refId,
      label: candidate.label,
      tier: candidate.tier,
      occurredAt: candidate.occurredAt,
    });
  }

  return picked;
}
