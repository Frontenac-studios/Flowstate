"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { entriesToCsv, type ExportRow } from "@/lib/time/entries-to-csv";
import {
  REPORT_PERIOD_LABEL,
  REPORT_PERIODS,
  resolveReportPeriod,
  type ReportPeriodKind,
} from "@/lib/time/report-period";
import { useTRPC } from "@/trpc/client";

function hoursLabel(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function moneyLabel(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

/**
 * The Money surface's time report (W3): pick a period and see the totals, the
 * business/personal split, the effective hourly rate, and the client → project →
 * task tree. Effective rate is billable revenue ÷ all hours, so non-billable and
 * unrated time drag it down honestly.
 */
export default function MoneyReport() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<ReportPeriodKind>("this_month");

  const tzOffsetMinutes = -new Date().getTimezoneOffset();
  const { start, end } = useMemo(
    () => resolveReportPeriod(period, new Date(), tzOffsetMinutes),
    [period, tzOffsetMinutes]
  );

  const { data: report, isLoading } = useQuery(
    trpc.timeEntries.report.queryOptions({ startedAt: start, endedAt: end })
  );

  const [exporting, setExporting] = useState(false);
  const downloadCsv = async () => {
    setExporting(true);
    try {
      const rows = (await queryClient.fetchQuery(
        trpc.timeEntries.exportRows.queryOptions({ startedAt: start, endedAt: end })
      )) as ExportRow[];
      const blob = new Blob([entriesToCsv(rows)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `flowstate-time-${period}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const totals = report?.totals;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Report period">
          {REPORT_PERIODS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setPeriod(kind)}
              aria-pressed={period === kind}
              className={`rounded-pill border px-3 py-1 text-xs transition-colors ${
                period === kind
                  ? "border-active-raised-border bg-active-raised text-ink"
                  : "border-subtle text-ink-muted hover:text-ink"
              }`}
            >
              {REPORT_PERIOD_LABEL[kind]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void downloadCsv()}
          disabled={exporting || !report || totals?.totalSeconds === 0}
          className="rounded-pill border border-subtle bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:text-accent disabled:opacity-50"
        >
          {exporting ? "Preparing…" : "Export CSV"}
        </button>
      </div>

      {isLoading || !report || !totals ? (
        <p className="text-sm text-ink-muted">Loading report…</p>
      ) : totals.totalSeconds === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
          No time tracked in this period.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Hours worked" value={hoursLabel(totals.totalSeconds)}>
              {hoursLabel(totals.billableSeconds)} billable ·{" "}
              {hoursLabel(totals.nonBillableSeconds)} not
            </Tile>
            <Tile label="Effective rate" value={`${moneyLabel(report.effectiveRateCents)}/h`}>
              {moneyLabel(report.revenueCents)} billable revenue ÷ all hours
            </Tile>
            <Tile label="Business vs personal" value={hoursLabel(totals.businessSeconds)}>
              business · {hoursLabel(totals.personalSeconds)} personal
            </Tile>
          </div>

          <div className="flex flex-col gap-2">
            {report.clients.map((client) => (
              <details
                key={client.clientId ?? "none"}
                className="rounded-card border border-subtle bg-surface"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-ink">{client.name}</span>
                  <span className="tabular-nums text-ink-muted">
                    {hoursLabel(client.seconds)}
                    {client.revenueCents > 0 ? ` · ${moneyLabel(client.revenueCents)}` : ""}
                  </span>
                </summary>
                <div className="flex flex-col gap-1.5 px-4 pb-3">
                  {client.projects.map((project) => (
                    <details key={project.projectId} className="rounded-control bg-surface-2">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-xs">
                        <span className="text-ink">{project.name}</span>
                        <span className="tabular-nums text-ink-muted">
                          {hoursLabel(project.seconds)}
                          {project.revenueCents > 0 ? ` · ${moneyLabel(project.revenueCents)}` : ""}
                        </span>
                      </summary>
                      <ul className="flex flex-col gap-1 px-3 pb-2">
                        {project.tasks.map((task) => (
                          <li
                            key={task.taskId ?? "none"}
                            className="flex items-center justify-between gap-3 text-xs text-ink-muted"
                          >
                            <span className="truncate">{task.title}</span>
                            <span className="tabular-nums">{hoursLabel(task.seconds)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-caption text-ink-muted">{label}</p>
      <p className="mt-1 text-title font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-caption text-ink-faint">{children}</p>
    </div>
  );
}
