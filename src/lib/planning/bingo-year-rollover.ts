import {
  type BingoYearRolloverStorageSnapshot,
  type FinalizeReminderUrgency,
  isBingoRolloverSnoozed,
} from "./bingo-year-rollover-storage";

const URGENCY_RANK: Record<FinalizeReminderUrgency, number> = {
  gentle: 0,
  nudge: 1,
  urgent: 2,
};

/** Late December window for the next-year bingo prompt (Dec 15–31). */
export function isLateDecember(now: Date): boolean {
  return now.getMonth() === 11 && now.getDate() >= 15;
}

export function isJanuary(now: Date): boolean {
  return now.getMonth() === 0;
}

/** Days remaining until Jan 31, only meaningful in January. */
export function daysUntilJan31(now: Date): number {
  const end = new Date(now.getFullYear(), 0, 31, 23, 59, 59, 999);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 86_400_000));
}

/** Escalating urgency as Jan 31 approaches. */
export function finalizeReminderUrgency(now: Date): FinalizeReminderUrgency | null {
  if (!isJanuary(now)) return null;

  const daysLeft = daysUntilJan31(now);
  if (daysLeft > 14) return "gentle";
  if (daysLeft > 7) return "nudge";
  return "urgent";
}

export function nextYearBingoPromptMessage(targetYear: number): string {
  return `${targetYear} is around the corner — start sketching your bingo card when you have a quiet moment.`;
}

export function finalizeReminderMessage(
  cardYear: number,
  urgency: FinalizeReminderUrgency
): string {
  switch (urgency) {
    case "gentle":
      return `Your ${cardYear} bingo card is still a draft. Target finalize by Jan 31.`;
    case "nudge":
      return `A few weeks left to finalize your ${cardYear} card — bingo rewards wait until you lock it in.`;
    case "urgent":
      return `Jan 31 is almost here. Finalize your ${cardYear} bingo card when you're ready.`;
  }
}

/** Late-Dec prompt to start next calendar year's card (YR-1 C1). */
export function isNextYearBingoPromptDue(
  now: Date,
  targetYear: number,
  hasNextYearCard: boolean,
  storage: BingoYearRolloverStorageSnapshot
): boolean {
  if (!isLateDecember(now)) return false;
  if (targetYear !== now.getFullYear() + 1) return false;
  if (hasNextYearCard) return false;
  if (storage.nextYearPromptDismissedForYear === targetYear) return false;
  if (isBingoRolloverSnoozed(now, storage.nextYearPromptSnoozeUntil)) return false;
  return true;
}

/** January finalize-by-Jan-31 reminder for the current year's draft card (YR-1 C2). */
export function isFinalizeReminderDue(
  now: Date,
  cardYear: number,
  cardStatus: "draft" | "final" | null,
  storage: BingoYearRolloverStorageSnapshot
): boolean {
  if (!isJanuary(now)) return false;
  if (cardYear !== now.getFullYear()) return false;
  if (cardStatus !== "draft") return false;
  if (storage.finalizeDismissedYear === cardYear) return false;
  if (isBingoRolloverSnoozed(now, storage.finalizeSnoozeUntil)) return false;

  const urgency = finalizeReminderUrgency(now);
  if (!urgency) return false;

  if (storage.finalizeDismissedUrgency) {
    if (URGENCY_RANK[urgency] <= URGENCY_RANK[storage.finalizeDismissedUrgency]) {
      return false;
    }
  }

  return true;
}
