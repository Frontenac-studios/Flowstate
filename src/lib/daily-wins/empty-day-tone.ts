/** Shared copy for quiet days — warm, never judgmental (DWN-5 / spec §4). */
export const EMPTY_DAY_FOOTER = "Tomorrow's a fresh page.";

const GUILT_PHRASES = [
  "missed",
  "failed",
  "should have",
  "you missed",
  "no wins",
  "streak",
] as const;

export function shouldShowEmptyDayFooter(opts: {
  writable: boolean;
  filledCount: number;
  proposalCount: number;
}): boolean {
  const hasActivity = opts.filledCount > 0 || opts.proposalCount > 0;
  return opts.writable && !hasActivity && opts.filledCount === 0;
}

/** Guards EoD / Care copy against guilt framing (spec §4, DWN-4). */
export function isJudgmentFreeCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return !GUILT_PHRASES.some((phrase) => lower.includes(phrase));
}
