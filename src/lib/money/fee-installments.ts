/**
 * Lump-sum installment rules (Spec v5 KashB2). Pure — the router and the Kash
 * table both read readiness through here so "billable now" has one definition.
 */

export type InstallmentStatus = "scheduled" | "ready" | "invoiced" | "paid";

export type InstallmentFacts = {
  /** Marked ready to bill by hand. */
  readyAt: Date | null;
  /** The linked milestone's completion, when there is a linked milestone. */
  milestoneCompletedAt: Date | null;
  /** The fee invoice that billed it (null = unbilled). Void invoices release this. */
  invoiceId: string | null;
  /** That invoice's paid date. */
  invoicePaidAt?: Date | null;
};

/** Ready = completed milestone OR marked ready by hand. Billed or not is separate. */
export function isInstallmentReady(i: InstallmentFacts): boolean {
  return i.readyAt != null || i.milestoneCompletedAt != null;
}

/** Billable now = ready and not yet on an invoice. */
export function isInstallmentBillable(i: InstallmentFacts): boolean {
  return i.invoiceId == null && isInstallmentReady(i);
}

export function installmentStatus(i: InstallmentFacts): InstallmentStatus {
  if (i.invoiceId != null) return i.invoicePaidAt != null ? "paid" : "invoiced";
  return isInstallmentReady(i) ? "ready" : "scheduled";
}
