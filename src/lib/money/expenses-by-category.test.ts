import { describe, expect, it } from "vitest";

import { aggregateExpensesByCategory, type ExpenseForChart } from "./expenses-by-category";

const now = new Date(Date.UTC(2026, 5, 15)); // 2026-06

function row(iso: string, category: string, cents: number): ExpenseForChart {
  return { incurredOn: new Date(`${iso}T00:00:00Z`), category, amountCents: cents };
}

describe("aggregateExpensesByCategory", () => {
  it("buckets by month within the window and drops rows before it", () => {
    const result = aggregateExpensesByCategory(
      [
        row("2026-05-10", "Software & Subscriptions", 1000),
        row("2026-06-02", "Software & Subscriptions", 2000),
        row("2026-06-20", "Travel", 5000),
        row("2025-12-31", "Travel", 9999), // before the 6-month window → dropped
      ],
      { monthsBack: 6, now }
    );

    expect(result.months).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
    const june = result.months.indexOf("2026-06");
    expect(result.monthTotals[june]).toBe(7000);
    // The 2025-12 row is outside the window entirely, so nothing counts it.
    expect(result.monthTotals.reduce((a, b) => a + b, 0)).toBe(1000 + 7000);
  });

  it("keeps the largest categories and folds the rest into Other", () => {
    const rows = ["A", "B", "C", "D", "E", "F", "G"].map((c, i) =>
      row("2026-06-01", c, (i + 1) * 100)
    );
    const result = aggregateExpensesByCategory(rows, { monthsBack: 3, maxCategories: 3, now });

    expect(result.categories[result.categories.length - 1]).toBe("Other");
    expect(result.categories).toHaveLength(4); // top 3 + Other
    const june = result.months.indexOf("2026-06");
    // Total is 100+200+…+700 = 2800 regardless of folding.
    expect(result.monthTotals[june]).toBe(2800);
  });
});
