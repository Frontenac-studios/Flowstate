"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Loader2, Upload } from "@/components/kash/ui/icon";
import { useTRPC } from "@/trpc/client";

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Import a Xero "Bills" CSV into the Draw panel (W16c). Parse + dedup happen
 * server-side; this shows a dry-run preview (new vs. already-imported, skipped
 * lines, warnings) and only writes on confirm. Re-importing an overlapping export
 * is safe — matching lines are skipped.
 */
export default function XeroImport({ onImported }: { onImported: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const preview = useMutation(trpc.money.previewXeroBills.mutationOptions());
  const importBills = useMutation(
    trpc.money.importXeroBills.mutationOptions({
      onSuccess: async (res) => {
        setCsv(null);
        setFileName(null);
        preview.reset();
        setDone(`Imported ${res.importedExpenses} expenses and ${res.importedDraws} draws.`);
        await queryClient.invalidateQueries({ queryKey: trpc.money.expensesByCategory.queryKey() });
        onImported();
      },
    })
  );

  const onFile = async (file: File) => {
    setDone(null);
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    preview.mutate({ csv: text });
  };

  const p = preview.data;

  return (
    <div className="flex flex-col gap-2 rounded-control bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-ink-muted">Import expenses from a Xero Bills CSV export.</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-pill border border-subtle bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:text-accent"
        >
          <Upload size={14} /> Choose CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {done ? <p className="text-caption text-ink">{done}</p> : null}
      {preview.isPending ? (
        <p className="flex items-center gap-1.5 text-caption text-ink-muted">
          <Loader2 size={14} className="animate-spin" /> Parsing {fileName}…
        </p>
      ) : null}
      {preview.isError ? <p className="text-caption text-critical">{preview.error.message}</p> : null}

      {p && csv ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-ink">
            <span className="font-medium">{p.newExpenseCount}</span> new expenses (
            {dollars(p.totalExpenseCents)})
            {p.newDrawCount > 0 ? (
              <>
                {" · "}
                <span className="font-medium">{p.newDrawCount}</span> draws ({dollars(p.totalDrawCents)})
              </>
            ) : null}
            {p.duplicateCount > 0 ? ` · ${p.duplicateCount} already imported` : ""}
            {p.skipped.length > 0 ? ` · ${p.skipped.length} skipped` : ""}
          </p>

          {p.warnings.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {p.warnings.map((w, i) => (
                <li key={i} className="text-caption text-ink-faint">
                  {w}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => importBills.mutate({ csv })}
              disabled={importBills.isPending || p.newExpenseCount + p.newDrawCount === 0}
              className="inline-flex items-center gap-1.5 rounded-pill bg-active-raised px-4 py-1.5 text-xs font-medium text-active-raised-border transition hover:opacity-90 disabled:opacity-50"
            >
              {importBills.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Import {p.newExpenseCount + p.newDrawCount} lines
            </button>
            <button
              type="button"
              onClick={() => {
                setCsv(null);
                setFileName(null);
                preview.reset();
              }}
              className="rounded-pill border border-subtle bg-surface px-3 py-1.5 text-xs text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
