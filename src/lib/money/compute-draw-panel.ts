/**
 * The Draw-panel math (W16, docs/v1-scope.md; discovery decisions 2.1–2.5). Pure,
 * so the numbers are testable and identical every run. A company of one has exactly
 * one pipe between the business and the person — the owner's draw — and this is the
 * math across it.
 *
 * The running cash ledger (2.3): business cash is derived live as
 *   collected (paid) invoices − business expenses − owner draws.
 * It is NOT the manual bank balance; that figure is a periodic reconcile whose only
 * job is to surface drift (a missed expense, an untracked draw).
 *
 * Earned / billed / collected stay distinct: only COLLECTED revenue is cash. Billed-
 * but-unpaid is shown alongside as incoming, never counted as available to draw.
 *
 * All amounts are integer cents. Runways are returned as month counts (may be
 * fractional); the caller formats them.
 */

export type DrawPanelSettings = {
  taxReservePercentBps: number | null;
  costOfLivingCents: number | null;
  personalSavingsCents: number | null;
  minimumDrawCents: number | null;
  bankBalanceCents: number | null;
};

export type DrawPanelInput = {
  /** Sum of paid, non-void invoices — the only revenue that is cash. */
  collectedRevenueCents: number;
  /** Sum of accepted, non-void, unpaid invoices — incoming, not yet cash. */
  billedUnpaidRevenueCents: number;
  /** Sum of business expenses in scope. */
  expensesCents: number;
  /** Sum of owner draws in scope. */
  drawsCents: number;
  /** Average monthly business burn, for the business runway (0 = unknown). */
  monthlyBurnCents: number;
  settings: DrawPanelSettings;
};

export type DrawPanel = {
  collectedRevenueCents: number;
  billedUnpaidRevenueCents: number;
  expensesCents: number;
  drawsCents: number;
  /** collected − expenses − draws. The live cash figure. */
  businessCashCents: number;
  /** Reserve on collected revenue, or null if no tax % is set. */
  taxReserveCents: number | null;
  /** business cash − tax reserve. What the owner can safely take. May be negative. */
  availableToDrawCents: number;
  /** business cash ÷ monthly burn, or null if burn is unknown. */
  businessRunwayMonths: number | null;
  /** personal savings ÷ cost of living, or null if cost of living is unset. */
  personalRunwayMonths: number | null;
  costOfLivingCents: number | null;
  minimumDrawCents: number | null;
  /** True when there isn't enough to meet the owner's minimum draw. */
  belowMinimumDraw: boolean;
  bankBalanceCents: number | null;
  /** manual bank balance − computed business cash. Non-zero = something is untracked. */
  bankDriftCents: number | null;
};

export function computeDrawPanel(input: DrawPanelInput): DrawPanel {
  const { collectedRevenueCents, expensesCents, drawsCents, monthlyBurnCents, settings } = input;

  const businessCashCents = collectedRevenueCents - expensesCents - drawsCents;

  const taxReserveCents =
    settings.taxReservePercentBps != null
      ? Math.round((collectedRevenueCents * settings.taxReservePercentBps) / 10000)
      : null;

  const availableToDrawCents = businessCashCents - (taxReserveCents ?? 0);

  const businessRunwayMonths =
    monthlyBurnCents > 0 ? businessCashCents / monthlyBurnCents : null;

  const personalRunwayMonths =
    settings.costOfLivingCents && settings.costOfLivingCents > 0
      ? (settings.personalSavingsCents ?? 0) / settings.costOfLivingCents
      : null;

  const belowMinimumDraw =
    settings.minimumDrawCents != null && availableToDrawCents < settings.minimumDrawCents;

  const bankDriftCents =
    settings.bankBalanceCents != null ? settings.bankBalanceCents - businessCashCents : null;

  return {
    collectedRevenueCents,
    billedUnpaidRevenueCents: input.billedUnpaidRevenueCents,
    expensesCents,
    drawsCents,
    businessCashCents,
    taxReserveCents,
    availableToDrawCents,
    businessRunwayMonths,
    personalRunwayMonths,
    costOfLivingCents: settings.costOfLivingCents,
    minimumDrawCents: settings.minimumDrawCents,
    belowMinimumDraw,
    bankBalanceCents: settings.bankBalanceCents,
    bankDriftCents,
  };
}
