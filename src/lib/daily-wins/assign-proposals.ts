import { HERO_WIN_SLOTS, type HeroWinSlot, type WinProposal } from "./types";

export type AcceptedWinRef = {
  refId: string | null;
};

/** Maps each empty hero slot to the next ranked proposal not already accepted. */
export function assignProposalsToEmptySlots(
  slots: ReadonlyArray<AcceptedWinRef | null>,
  proposals: ReadonlyArray<WinProposal>
): Map<HeroWinSlot, WinProposal> {
  const acceptedRefIds = new Set(
    slots
      .filter((slot): slot is AcceptedWinRef => slot != null && slot.refId != null)
      .map((slot) => slot.refId as string)
  );
  const available = proposals.filter((proposal) => !acceptedRefIds.has(proposal.refId));
  const emptySlots = HERO_WIN_SLOTS.filter((slot) => slots[slot] == null);

  const map = new Map<HeroWinSlot, WinProposal>();
  emptySlots.forEach((slot, index) => {
    const proposal = available[index];
    if (proposal) map.set(slot, proposal);
  });
  return map;
}
