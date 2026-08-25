"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Input from "@/components/kash/ui/Input";
import { entriesToCsv, type ExportRow } from "@/lib/time/entries-to-csv";
import { useTRPC } from "@/trpc/client";

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

/** Local midnight for a YYYY-MM-DD string. */
function localMidnight(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

/**
 * Export raw time entries for a period as CSV (W2e). The button fetches the rows,
 * builds the CSV in the browser, and hands the file to the user via a download —
 * the same row shape W3 reporting and W4 invoices read.
 */
export function TimeExportSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      // `end` is inclusive: fetch up to midnight of the following day.
      const endExclusive = new Date(localMidnight(end).getTime() + 24 * 60 * 60 * 1000);
      const rows = (await queryClient.fetchQuery(
        trpc.timeEntries.exportRows.queryOptions({
          startedAt: localMidnight(start),
          endedAt: endExclusive,
        })
      )) as ExportRow[];

      const csv = entriesToCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `flowstate-time-${start}_to_${end}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't build the export. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Export time</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Download raw time entries for a period as CSV — date, client, project, task, tag, duration,
        billable, and invoiced.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          From
          <Input
            type="date"
            value={start}
            max={end}
            onChange={(e) => setStart(e.target.value)}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          To
          <Input
            type="date"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            className="text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy}
          className="rounded-control bg-ink px-3 py-1.5 text-sm font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Preparing…" : "Download CSV"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
