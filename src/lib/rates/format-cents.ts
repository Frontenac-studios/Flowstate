/**
 * Format integer cents as a currency string. Amounts live as cents everywhere in
 * the money layer (never floats); this is the single place they become display text.
 */
export function formatCents(amountCents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amountCents / 100);
  } catch {
    // Intl throws on an unknown currency code; fall back to a bare amount + code.
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}
