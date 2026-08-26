/**
 * The user's Xero Chart of Accounts (W16c), captured so a Bills CSV import can map
 * each line's `AccountCode` to a human category and route it to the right side of
 * the draw math. Kept as data, not a taxonomy the app manages — `business_expenses`
 * stores the resulting category as free text (discovery decision 2.2).
 *
 * `klass` is the routing decision:
 *   expense → a `business_expenses` row (the P&L cost side)
 *   revenue → skipped on import (revenue is derived from invoices, never a CSV)
 *   draw    → an `owner_draws` row (3200, Owner's Draws)
 *   other   → skipped (assets, liabilities, other equity) with a warning
 */
export type AccountKlass = "expense" | "revenue" | "draw" | "other";

export type AccountInfo = { name: string; klass: AccountKlass };

export const CHART_OF_ACCOUNTS: Readonly<Record<string, AccountInfo>> = {
  // Assets / liabilities — skipped on import.
  "1200": { name: "Accounts Receivable", klass: "other" },
  "1300": { name: "Prepaid Expenses", klass: "other" },
  "1500": { name: "Office Equipment", klass: "other" },
  "1510": { name: "Computer Equipment", klass: "other" },
  "1590": { name: "Accumulated Depreciation", klass: "other" },
  "2000": { name: "Accounts Payable", klass: "other" },
  "2050": { name: "Customer Deposits", klass: "other" },
  "2110": { name: "Interest Payable", klass: "other" },
  "2150": { name: "Unpaid Expense Claims", klass: "other" },
  "2230": { name: "Sales Tax", klass: "other" },
  // Equity.
  "3000": { name: "Retained Earnings", klass: "other" },
  "3100": { name: "Owner's Equity", klass: "other" },
  "3200": { name: "Owner's Draws", klass: "draw" },
  // Revenue.
  "4100": { name: "Service Revenue", klass: "revenue" },
  "4200": { name: "Other Revenues", klass: "revenue" },
  "7000": { name: "Interest Income", klass: "revenue" },
  "7100": { name: "Gain/(Loss) on Disposal of Assets", klass: "revenue" },
  // Expenses.
  "6000": { name: "Advertising", klass: "expense" },
  "6020": { name: "Bad Debt Expense", klass: "expense" },
  "6030": { name: "Bank Fees", klass: "expense" },
  "6040": { name: "Merchant Fees", klass: "expense" },
  "6080": { name: "Computer Expenses", klass: "expense" },
  "6090": { name: "Contract Labor", klass: "expense" },
  "6100": { name: "Depreciation", klass: "expense" },
  "6110": { name: "Dues and Subscriptions", klass: "expense" },
  "6130": { name: "Entertainment", klass: "expense" },
  "6160": { name: "Licenses and Fees", klass: "expense" },
  "6170": { name: "Insurance - Liability", klass: "expense" },
  "6210": { name: "Insurance - Other", klass: "expense" },
  "6220": { name: "Interest Expense", klass: "expense" },
  "6230": { name: "Meals", klass: "expense" },
  "6240": { name: "Miscellaneous Expense", klass: "expense" },
  "6250": { name: "Office Expense", klass: "expense" },
  "6270": { name: "Postage and Delivery", klass: "expense" },
  "6280": { name: "Printing and Stationary", klass: "expense" },
  "6290": { name: "Professional Fees", klass: "expense" },
  "6310": { name: "Coworking & Equipment Rental", klass: "expense" },
  "6340": { name: "Software & Subscriptions", klass: "expense" },
  "6350": { name: "Supplies", klass: "expense" },
  "6380": { name: "Taxes - Other", klass: "expense" },
  "6390": { name: "Telephone and Internet", klass: "expense" },
  "6400": { name: "Training and Conferences", klass: "expense" },
  "6410": { name: "Travel", klass: "expense" },
  "6430": { name: "Utilities", klass: "expense" },
  "6440": { name: "Vehicle Expense", klass: "expense" },
  "6450": { name: "Wages and Salaries", klass: "expense" },
  "8000": { name: "Charitable Contributions", klass: "expense" },
};

/** Look up an account code; unknown codes fall back to a labelled "other". */
export function resolveAccount(code: string): AccountInfo {
  return CHART_OF_ACCOUNTS[code.trim()] ?? { name: `Account ${code.trim()}`, klass: "other" };
}
