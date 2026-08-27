/**
 * Hybrid Target measures (W5, discovery §13 Q1). Where Flowstate owns the data, a
 * bet's current value is derived live at read — never written onto the org_shared
 * target row, so booked revenue can't leak through a `SELECT *`. Manual bets hold
 * their last-entered value instead. This module is the pure derivation, fed
 * pre-fetched rows so it runs the same over Postgres and the SQLite mirror.
 */

export type DerivationKey = "money_booked" | "clients_signed" | "milestones_shipped";

export type MeasureSources = {
  /** Accepted invoices (void excluded), with the instant they were booked. */
  invoices: ReadonlyArray<{ amountCents: number; bookedAt: Date }>;
  /** Clients, by the instant they were signed (created). */
  clients: ReadonlyArray<{ signedAt: Date }>;
  /** Completed phases of projects serving a target, tagged with that target. */
  shippedPhases: ReadonlyArray<{ targetId: string; completedAt: Date }>;
};

function inPeriod(at: Date, start: Date, end: Date): boolean {
  const t = at.getTime();
  return t >= start.getTime() && t < end.getTime();
}

/**
 * The current value of an `auto` target over its period: cents booked for
 * `money_booked`, a count of clients for `clients_signed`, a count of shipped
 * phases (of projects serving this target) for `milestones_shipped`.
 */
export function deriveTargetCurrent(
  target: { id: string; derivationKey: DerivationKey; periodStart: Date; periodEnd: Date },
  sources: MeasureSources
): number {
  const { periodStart: start, periodEnd: end } = target;
  switch (target.derivationKey) {
    case "money_booked":
      return sources.invoices
        .filter((i) => inPeriod(i.bookedAt, start, end))
        .reduce((sum, i) => sum + i.amountCents, 0);
    case "clients_signed":
      return sources.clients.filter((c) => inPeriod(c.signedAt, start, end)).length;
    case "milestones_shipped":
      return sources.shippedPhases.filter(
        (p) => p.targetId === target.id && inPeriod(p.completedAt, start, end)
      ).length;
  }
}

/** A bet is met once its current reaches its target (a shipped bet targets 1). */
export function isTargetMet(current: number, measureTarget: number): boolean {
  return current >= measureTarget;
}

/** Progress 0–1 for the bar. Shipped/boolean bets read met-or-not, not a fraction. */
export function measureProgress(current: number, measureTarget: number): number {
  if (measureTarget <= 0) return current > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, current / measureTarget));
}
