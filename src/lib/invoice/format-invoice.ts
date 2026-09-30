/**
 * Render an accepted invoice to the two hand-off formats W4 produces: a
 * paste-ready Markdown block (the structure from the `/invoice` skill) and a CSV
 * of the line items. Flowstate stops here — no PDF, no payment tracking, no
 * sending (product law 1). Pure functions; money and hours are already decided by
 * the draft engine, this only formats them.
 */

const SECONDS_PER_HOUR = 3600;

export type InvoiceLineView = {
  label: string;
  description: string;
  billedSeconds: number;
  amountCents: number;
};

export type InvoiceView = {
  /** `time` (hourly, the default) or `fee` (lump sum — no hours, no rate). */
  kind?: "time" | "fee";
  invoiceNumber: number;
  clientName: string;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  rateCents: number;
  billedSeconds: number;
  carriedSeconds: number;
  amountCents: number;
  lines: readonly InvoiceLineView[];
};

function hours(seconds: number): string {
  return (seconds / SECONDS_PER_HOUR).toFixed(2);
}

function dollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Escape a CSV cell per RFC 4180: quote when it contains a comma, quote, or newline. */
function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A lump-sum invoice: one line per installment, amounts only. */
function feeInvoiceToMarkdown(invoice: InvoiceView): string {
  const lines: string[] = [
    `INVOICE #${invoice.invoiceNumber} — ${invoice.clientName}`,
    `Issued: ${isoDate(invoice.issuedAt)}`,
    `Amount due: $${dollars(invoice.amountCents)}`,
    "",
    "Delivered:",
    "",
  ];
  for (const line of invoice.lines) {
    lines.push(`${line.label} — $${dollars(line.amountCents)}`);
    if (line.description.trim()) lines.push(`  ${line.description.trim()}`);
    lines.push("");
  }
  lines.push("—");
  lines.push(`Total: $${dollars(invoice.amountCents)}`);
  return lines.join("\n");
}

/** The paste-ready plain-text/Markdown invoice block. */
export function invoiceToMarkdown(invoice: InvoiceView): string {
  if (invoice.kind === "fee") return feeInvoiceToMarkdown(invoice);
  const period = `${isoDate(invoice.periodStart)} – ${isoDate(invoice.periodEnd)}`;
  const rate = dollars(invoice.rateCents);

  const lines: string[] = [
    `INVOICE #${invoice.invoiceNumber} — ${invoice.clientName}`,
    `Period: ${period} · Issued: ${isoDate(invoice.issuedAt)}`,
    `Billable this invoice: ${hours(invoice.billedSeconds)} h @ $${rate}/hr = $${dollars(invoice.amountCents)}`,
    "",
    "Work delivered:",
    "",
  ];

  for (const line of invoice.lines) {
    lines.push(`${line.label} — ${hours(line.billedSeconds)} h`);
    if (line.description.trim()) lines.push(`  ${line.description.trim()}`);
    lines.push("");
  }

  lines.push("—");
  lines.push("Billing summary");
  lines.push(
    `  Billed on this invoice:   ${hours(invoice.billedSeconds)} h  ($${dollars(invoice.amountCents)})`
  );
  lines.push(`  Carried to next invoice:  ${hours(invoice.carriedSeconds)} h`);

  return lines.join("\n");
}

/**
 * CSV of the invoice line items: Label, Description, Hours, Amount (USD). A fee
 * invoice leaves Hours blank — a lump sum has none.
 */
export function invoiceToCsv(invoice: InvoiceView): string {
  const header = ["Label", "Description", "Hours", "Amount (USD)"];
  const rows = invoice.lines.map((line) =>
    [
      csvCell(line.label),
      csvCell(line.description),
      invoice.kind === "fee" ? "" : hours(line.billedSeconds),
      (line.amountCents / 100).toFixed(2),
    ].join(",")
  );
  return [header.join(","), ...rows].join("\r\n");
}
