import { parseCsvObjects } from "@/lib/csv/parse-csv";

import { resolveAccount } from "./chart-of-accounts";

/**
 * Parse a Xero "Bills" CSV export into draw-panel rows (W16c). The rules are the
 * user's, and deliberate:
 *   • AccountCode → category + routing, via the Chart of Accounts.
 *   • LineAmount → integer cents.
 *   • The date lives as a PREFIX inside Description (e.g. "06/01/2026 Google
 *     Workspace - subscription" or "01/13/2026 - Circa 1200, Llc - …"), NOT in
 *     InvoiceDate (which is the bill/reimbursement date, not when the cost fell).
 *   • Merchant = the Description, after the date, before the first " - ".
 *
 * Expense accounts become business_expenses; 3200 (Owner's Draws) becomes an
 * owner_draw; revenue/asset/liability lines are skipped (revenue is derived from
 * invoices, never a CSV). A line whose merchant recurs across ≥2 months is flagged.
 * Pure — the router decides what to write.
 */

export type ParsedBillLine = {
  incurredOn: string; // ISO "YYYY-MM-DD"
  amountCents: number;
  merchant: string;
  category: string;
  accountCode: string;
  klass: "expense" | "draw";
  description: string;
  recurring: boolean;
  /** Natural key for skip-on-reimport: date|amount|merchant. */
  dedupKey: string;
};

export type SkippedBillLine = { description: string; accountCode: string; reason: string };

export type XeroBillsPreview = {
  expenses: ParsedBillLine[];
  draws: ParsedBillLine[];
  skipped: SkippedBillLine[];
  warnings: string[];
  totalExpenseCents: number;
  totalDrawCents: number;
};

const DATE_PREFIX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:-\s*)?(.*)$/;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function pad(n: string): string {
  return n.padStart(2, "0");
}

function usDateToIso(mm: string, dd: string, yyyy: string): string | null {
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${pad(mm)}-${pad(dd)}`;
}

/** Pull the leading date and the remaining text out of a Description. */
function splitDatePrefix(description: string): { iso: string | null; rest: string } {
  const m = DATE_PREFIX.exec(description.trim());
  if (!m) return { iso: null, rest: description.trim() };
  const [, mm, dd, yyyy, rest] = m;
  return { iso: usDateToIso(mm!, dd!, yyyy!), rest: rest!.trim() };
}

function merchantOf(rest: string): string {
  const first = rest.split(" - ")[0]!.trim();
  return first || rest.trim() || "(unknown)";
}

function amountToCents(lineAmount: string): number | null {
  const n = Number((lineAmount || "").replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function yearMonth(iso: string): string {
  return iso.slice(0, 7);
}

export function parseXeroBills(csvText: string): XeroBillsPreview {
  const rows = parseCsvObjects(csvText);
  const warnings: string[] = [];
  const skipped: SkippedBillLine[] = [];
  const lines: ParsedBillLine[] = [];

  let nonBillCount = 0;

  for (const row of rows) {
    const type = (row["Type"] ?? "").trim();
    if (type && type !== "Bill") {
      nonBillCount++;
      continue;
    }

    const description = (row["Description"] ?? "").trim();
    const accountCode = (row["AccountCode"] ?? "").trim();
    if (!description && !accountCode) continue; // blank line

    const amountCents = amountToCents(row["LineAmount"] ?? "");
    if (amountCents == null || amountCents === 0) {
      skipped.push({ description, accountCode, reason: "no usable LineAmount" });
      continue;
    }

    const account = resolveAccount(accountCode);
    if (account.klass === "revenue") {
      skipped.push({
        description,
        accountCode,
        reason: "revenue line — derived from invoices, not imported",
      });
      continue;
    }
    if (account.klass === "other") {
      skipped.push({
        description,
        accountCode,
        reason: `${account.name} is not an expense or draw`,
      });
      continue;
    }

    const { iso, rest } = splitDatePrefix(description);
    let incurredOn = iso;
    if (!incurredOn) {
      // No date prefix — fall back to InvoiceDate, and say so.
      const inv = (row["InvoiceDate"] ?? "").trim();
      const m = US_DATE.exec(inv);
      incurredOn = m ? usDateToIso(m[1]!, m[2]!, m[3]!) : null;
      if (incurredOn) {
        warnings.push(`"${description}" had no date prefix — used InvoiceDate ${inv}.`);
      } else {
        skipped.push({ description, accountCode, reason: "no parseable date" });
        continue;
      }
    }

    const merchant = merchantOf(rest || description);
    lines.push({
      incurredOn,
      amountCents,
      merchant,
      category: account.name,
      accountCode,
      klass: account.klass,
      description: rest || description,
      recurring: false,
      dedupKey: `${incurredOn}|${amountCents}|${merchant}`,
    });
  }

  // Recurring = same merchant in ≥2 distinct months.
  const monthsByMerchant = new Map<string, Set<string>>();
  for (const line of lines) {
    const set = monthsByMerchant.get(line.merchant) ?? new Set<string>();
    set.add(yearMonth(line.incurredOn));
    monthsByMerchant.set(line.merchant, set);
  }
  for (const line of lines) {
    line.recurring = (monthsByMerchant.get(line.merchant)?.size ?? 0) >= 2;
  }

  if (nonBillCount > 0) {
    warnings.push(`Skipped ${nonBillCount} non-Bill row${nonBillCount === 1 ? "" : "s"}.`);
  }

  const expenses = lines.filter((l) => l.klass === "expense");
  const draws = lines.filter((l) => l.klass === "draw");

  return {
    expenses,
    draws,
    skipped,
    warnings,
    totalExpenseCents: expenses.reduce((s, l) => s + l.amountCents, 0),
    totalDrawCents: draws.reduce((s, l) => s + l.amountCents, 0),
  };
}
