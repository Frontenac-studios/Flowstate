import type { BudgetBar } from "@/lib/budget/compute-budget-bar";

/**
 * The Ledger's sentence. Pure, so the four states can be checked without
 * rendering — and so the wording stays a stated fact, never a verdict. It reports
 * what happened; it does not grade it (law 3).
 */
export type LedgerCopy = {
  /** The said-vs-spent line. */
  headline: string;
  /** A quiet caveat, or null. Never a warning. */
  note: string | null;
};

export function ledgerCopy(params: {
  bar: BudgetBar;
  /** False when the fortnight belongs to an earlier quarter than today's. */
  isCurrentQuarter: boolean;
  /** "sealed" carries the tilt as declared then; "live" can only use today's. */
  source: "sealed" | "live";
  quarterLabel: string;
}): LedgerCopy {
  const { bar, isCurrentQuarter, source, quarterLabel } = params;

  /**
   * A live read of an earlier quarter can only hold the fortnight against the
   * declaration in force *now*, which was not the one in force then. Say so
   * rather than letting the sentence imply a promise that was never made.
   */
  const staleTilt =
    source === "live" && !isCurrentQuarter && bar.tiltBusinessPct !== null
      ? `Held against your current declaration of ${bar.tiltBusinessPct}% — ${quarterLabel}'s tilt isn't on record.`
      : null;

  if (bar.state === "empty") {
    return {
      headline:
        bar.tiltBusinessPct !== null
          ? `You said ${bar.tiltBusinessPct}% business. Nothing was logged in this fortnight.`
          : "Nothing was logged in this fortnight.",
      note: null,
    };
  }

  if (bar.state === "unset") {
    return {
      headline: `You spent ${bar.actualBusinessPct}% of this fortnight on business.`,
      note: "No tilt declared for the quarter yet.",
    };
  }

  return {
    headline: `You said ${bar.tiltBusinessPct}% business. You spent ${bar.actualBusinessPct}%.`,
    note: staleTilt,
  };
}
