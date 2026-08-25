/**
 * Turn exported time-entry rows into a CSV string (W2e). Pure and side-effect
 * free so it is trivially testable; the component handles the download. Dates and
 * times render in the runtime's local zone, which is the browser's — the same zone
 * the user tracked in.
 */

export type ExportRow = {
  startedAt: Date;
  endedAt: Date | null;
  clientName: string | null;
  projectName: string;
  taskTitle: string | null;
  tagName: string | null;
  description: string | null;
  billable: boolean;
  invoicedAt: Date | null;
};

const HEADER = [
  "Date",
  "Start",
  "End",
  "Client",
  "Project",
  "Task",
  "Tag",
  "Description",
  "Hours",
  "Billable",
  "Invoiced",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeOnly(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Decimal hours to two places, or "" for a still-running entry. */
function hours(row: ExportRow): string {
  if (!row.endedAt) return "";
  const seconds = Math.max(0, Math.floor((row.endedAt.getTime() - row.startedAt.getTime()) / 1000));
  return (seconds / 3600).toFixed(2);
}

/** RFC-4180 escaping: quote a field that contains a comma, quote, or newline. */
function escape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function line(cells: string[]): string {
  return cells.map(escape).join(",");
}

export function entriesToCsv(rows: ExportRow[]): string {
  const body = rows.map((row) =>
    line([
      dateOnly(row.startedAt),
      timeOnly(row.startedAt),
      row.endedAt ? timeOnly(row.endedAt) : "",
      row.clientName ?? "",
      row.projectName,
      row.taskTitle ?? "",
      row.tagName ?? "",
      row.description ?? "",
      hours(row),
      row.billable ? "yes" : "no",
      row.invoicedAt ? dateOnly(row.invoicedAt) : "",
    ])
  );
  return [line(HEADER), ...body].join("\n");
}
