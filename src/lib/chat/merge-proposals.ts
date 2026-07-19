import type { ProposedAction } from "./proposed-actions";

/**
 * Combine consecutive proposals of the same kind into one card, so a model that
 * splits one batch across two tool calls doesn't lose everything but the last call.
 * Different kinds can't share a card, so the newer one wins.
 */
export function mergeProposals(prev: ProposedAction | null, next: ProposedAction): ProposedAction {
  if (!prev || prev.kind !== next.kind) return next;
  return {
    ...next,
    summary: prev.summary ?? next.summary,
    items: [...prev.items, ...next.items],
  } as ProposedAction;
}
