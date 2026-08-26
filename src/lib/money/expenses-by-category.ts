/**
 * Aggregate business expenses into a month × category grid for the Draw panel's
 * "expenses by category over time" chart (W16c). Pure. Keeps the largest few
 * categories and folds the rest into "Other" so the stacked chart stays legible.
 */

export type ExpenseForChart = {
  amountCents: number;
  category: string | null;
  incurredOn: Date;
};

export type ExpensesByCategory = {
  /** Chronological "YYYY-MM" buckets present in the window. */
  months: string[];
  /** Category labels, largest total first, with a trailing "Other" if folded. */
  categories: string[];
  /** cents[monthIndex][categoryIndex]. */
  cells: number[][];
  /** Total cents per month (index-aligned with `months`). */
  monthTotals: number[];
};

const OTHER = "Other";

function ym(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function aggregateExpensesByCategory(
  rows: readonly ExpenseForChart[],
  opts?: { monthsBack?: number; maxCategories?: number; now?: Date }
): ExpensesByCategory {
  const monthsBack = opts?.monthsBack ?? 6;
  const maxCategories = opts?.maxCategories ?? 6;
  const now = opts?.now ?? new Date();

  // The window: the last `monthsBack` months including the current one.
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(ym(d));
  }
  const monthIndex = new Map(months.map((m, i) => [m, i]));

  // Total per raw category across the window, to pick the top categories.
  const totalByCategory = new Map<string, number>();
  const inWindow: { month: string; category: string; cents: number }[] = [];
  for (const row of rows) {
    const month = ym(row.incurredOn);
    if (!monthIndex.has(month)) continue;
    const category = row.category?.trim() || "Uncategorized";
    inWindow.push({ month, category, cents: row.amountCents });
    totalByCategory.set(category, (totalByCategory.get(category) ?? 0) + row.amountCents);
  }

  const ranked = Array.from(totalByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
  const kept = ranked.slice(0, maxCategories);
  const keptSet = new Set(kept);
  const hasOther = ranked.length > kept.length;
  const categories = hasOther ? [...kept, OTHER] : kept;
  const categoryIndex = new Map(categories.map((c, i) => [c, i]));

  const cells: number[][] = months.map(() => categories.map(() => 0));
  const monthTotals = months.map(() => 0);

  for (const item of inWindow) {
    const mi = monthIndex.get(item.month)!;
    const label = keptSet.has(item.category) ? item.category : OTHER;
    const ci = categoryIndex.get(label);
    if (ci == null) continue;
    cells[mi]![ci]! += item.cents;
    monthTotals[mi]! += item.cents;
  }

  return { months, categories, cells, monthTotals };
}
