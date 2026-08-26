import { describe, expect, it } from "vitest";

import { parseXeroBills } from "./parse-xero-bills";

const CSV = [
  "Description,AccountCode,LineAmount,InvoiceDate,Type",
  "06/01/2026 Google Workspace - subscription,6340,2.9800,6/30/2026,Bill",
  "07/05/2026 Google Workspace - subscription,6340,2.9800,7/31/2026,Bill",
  '"01/13/2026 - Circa 1200, Llc - FBN setup related expense",6160,30.0000,5/6/2026,Bill',
  "05/06/2026 - Owner draw to self,3200,500.0000,5/6/2026,Bill",
  "06/06/2026 Anthropic Claude - AI,4100,100.0000,6/30/2026,Bill",
  "No date prefix office thing,6250,10.0000,5/6/2026,Bill",
  "",
].join("\n");

describe("parseXeroBills", () => {
  const result = parseXeroBills(CSV);

  it("routes expense accounts to expenses and 3200 to draws, skipping revenue", () => {
    expect(result.expenses).toHaveLength(4); // 2× Google, Circa, no-prefix office
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]!.category).toBe("Owner's Draws");
    expect(result.draws[0]!.amountCents).toBe(50000);
    expect(result.skipped.some((s) => s.accountCode === "4100")).toBe(true);
  });

  it("takes the date from the Description prefix, not InvoiceDate, and converts to cents", () => {
    const google = result.expenses.find((e) => e.merchant === "Google Workspace")!;
    expect(google.incurredOn).toBe("2026-06-01"); // prefix, not 6/30
    expect(google.amountCents).toBe(298);
    expect(google.category).toBe("Software & Subscriptions");
  });

  it("parses the merchant before the first ' - ', through a quoted comma", () => {
    const circa = result.expenses.find((e) => e.accountCode === "6160")!;
    expect(circa.merchant).toBe("Circa 1200, Llc");
    expect(circa.incurredOn).toBe("2026-01-13");
    expect(circa.amountCents).toBe(3000);
  });

  it("flags a merchant that recurs across ≥2 months", () => {
    const googles = result.expenses.filter((e) => e.merchant === "Google Workspace");
    expect(googles.every((g) => g.recurring)).toBe(true);
    const circa = result.expenses.find((e) => e.accountCode === "6160")!;
    expect(circa.recurring).toBe(false);
  });

  it("falls back to InvoiceDate with a warning when there is no date prefix", () => {
    const office = result.expenses.find((e) => e.accountCode === "6250")!;
    expect(office.incurredOn).toBe("2026-05-06"); // from InvoiceDate
    expect(result.warnings.some((w) => w.includes("no date prefix"))).toBe(true);
  });
});
