import { describe, expect, it } from "vitest";

import { invoiceToCsv, invoiceToMarkdown, type InvoiceView } from "./format-invoice";

const invoice: InvoiceView = {
  invoiceNumber: 3,
  clientName: "Great White",
  periodStart: new Date("2026-08-01T00:00:00Z"),
  periodEnd: new Date("2026-08-31T00:00:00Z"),
  issuedAt: new Date("2026-09-01T00:00:00Z"),
  rateCents: 4500,
  billedSeconds: 20 * 3600,
  carriedSeconds: 3.5 * 3600,
  amountCents: 90000,
  lines: [
    {
      label: "Reporting pipeline",
      description: "Built the nightly P&L export.",
      billedSeconds: 12 * 3600,
      amountCents: 54000,
    },
    {
      label: "Additional work",
      description: "Assorted fixes, comma, and review.",
      billedSeconds: 8 * 3600,
      amountCents: 36000,
    },
  ],
};

describe("invoiceToMarkdown", () => {
  const md = invoiceToMarkdown(invoice);

  it("leads with the invoice number, client, and billable total", () => {
    expect(md).toContain("INVOICE #3 — Great White");
    expect(md).toContain("20.00 h @ $45.00/hr = $900.00");
  });

  it("lists each line with hours and shows the carry-forward in the summary", () => {
    expect(md).toContain("Reporting pipeline — 12.00 h");
    expect(md).toContain("Built the nightly P&L export.");
    expect(md).toContain("Carried to next invoice:  3.50 h");
  });
});

describe("invoiceToCsv", () => {
  const csv = invoiceToCsv(invoice);

  it("has a header and one row per line, quoting cells with commas", () => {
    const rows = csv.split("\r\n");
    expect(rows[0]).toBe("Label,Description,Hours,Amount (USD)");
    expect(rows).toHaveLength(3);
    expect(rows[2]).toContain('"Assorted fixes, comma, and review."');
    expect(rows[1]).toContain("12.00,540.00");
  });
});
