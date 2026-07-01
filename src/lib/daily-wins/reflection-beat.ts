import type { WinProposal } from "./types";
import { MAX_WIN_PROPOSALS } from "./types";

export type ReflectionBeatDayContext = {
  winDate: string;
  completionsToday: number;
  top3DoneCount: number;
  careEventCount: number;
  acceptedWinCount: number;
};

export type ReflectionBeatResult = {
  proposals: WinProposal[];
  gentlePrompt: string | null;
};

/** Merge Reflection-register proposals with F1 read-time ranking (F1 order first). */
export function mergeReflectionProposals(
  baseProposals: readonly WinProposal[],
  supplemental: readonly WinProposal[]
): WinProposal[] {
  const seen = new Set<string>();
  const merged: WinProposal[] = [];

  for (const proposal of baseProposals) {
    if (seen.has(proposal.refId)) continue;
    seen.add(proposal.refId);
    merged.push(proposal);
    if (merged.length >= MAX_WIN_PROPOSALS) return merged;
  }

  for (const proposal of supplemental) {
    if (seen.has(proposal.refId)) continue;
    seen.add(proposal.refId);
    merged.push(proposal);
    if (merged.length >= MAX_WIN_PROPOSALS) break;
  }

  return merged;
}

function dayHadActivity(ctx: ReflectionBeatDayContext): boolean {
  return (
    ctx.completionsToday > 0 ||
    ctx.top3DoneCount > 0 ||
    ctx.careEventCount > 0 ||
    ctx.acceptedWinCount > 0
  );
}

/**
 * Single gentle EoD prompt for the wins beat. Never guilt for zero wins; null on quiet days.
 * Essential-nudges-only: at most one short line, no "you missed it" framing.
 */
export function buildGentleEodWinPrompt(
  ctx: ReflectionBeatDayContext,
  proposals: readonly WinProposal[]
): string | null {
  if (ctx.acceptedWinCount > 0 && proposals.length === 0) {
    return null;
  }

  if (proposals.length > 0) {
    return "A few moments stood out today — keep what resonates below.";
  }

  if (!dayHadActivity(ctx)) {
    return null;
  }

  if (ctx.completionsToday > 0 || ctx.top3DoneCount > 0 || ctx.careEventCount > 0) {
    return "Anything small worth keeping from today?";
  }

  return null;
}

export function templateReflectionBeat(
  baseProposals: readonly WinProposal[],
  supplemental: readonly WinProposal[],
  ctx: ReflectionBeatDayContext
): ReflectionBeatResult {
  const proposals = mergeReflectionProposals(baseProposals, supplemental);
  const gentlePrompt = buildGentleEodWinPrompt(ctx, proposals);
  return { proposals, gentlePrompt };
}
