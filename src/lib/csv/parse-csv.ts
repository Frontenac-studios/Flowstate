/**
 * A small, dependency-free RFC 4180 CSV reader. The app has no CSV parse library,
 * and the Xero Bills export has quoted fields with embedded commas ("Circa 1200,
 * Llc") and the occasional doubled quote, so a naive split(",") is wrong. Returns
 * rows of raw string cells; interpretation is the caller's job.
 */

/** Parse CSV text into rows of string cells. Handles quotes, embedded commas/newlines, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      pushRow();
    } else {
      field += ch;
    }
  }

  // Flush the final field/row unless the file ended on a clean newline.
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

/**
 * Parse CSV into objects keyed by the header row. Trims header names; skips a
 * trailing all-empty row (Xero exports end with one).
 */
export function parseCsvObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0]!.map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!;
    if (cells.length === 1 && cells[0]!.trim() === "") continue; // trailing blank line
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]!] = cells[c] ?? "";
    out.push(obj);
  }
  return out;
}
