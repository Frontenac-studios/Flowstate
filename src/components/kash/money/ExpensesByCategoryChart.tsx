"use client";

/**
 * Expenses by category over time (W16c) — a stacked monthly bar chart. Monochrome
 * to fit the flat-calm aesthetic: each category is a step on an ink opacity ramp,
 * keyed by the legend, so it reads in both themes without a colour system.
 */

type ChartData = {
  months: string[];
  categories: string[];
  cells: number[][];
  monthTotals: number[];
};

// Opacity ramp, darkest (largest category) first. Caps at 7 legend rows.
const RAMP = [0.92, 0.74, 0.58, 0.44, 0.32, 0.22, 0.14];

function monthLabel(ym: string): string {
  const [, m] = ym.split("-");
  return (
    ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
      Number(m)
    ] ?? ym
  );
}
function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default function ExpensesByCategoryChart({ data }: { data: ChartData }) {
  const max = Math.max(1, ...data.monthTotals);
  const hasAny = data.monthTotals.some((t) => t > 0);

  const W = 320;
  const H = 140;
  const padBottom = 18;
  const chartH = H - padBottom;
  const slot = W / data.months.length;
  const barW = Math.min(36, slot * 0.6);

  if (!hasAny) {
    return (
      <p className="rounded-card border border-dashed border-border bg-surface p-4 text-caption text-ink-muted">
        No expenses in the last 6 months yet — add or import some below.
      </p>
    );
  }

  return (
    <div className="rounded-card border border-subtle bg-surface p-4">
      <p className="mb-2 text-caption font-medium uppercase tracking-wide text-ink-faint">
        Expenses by category · last 6 months
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Expenses by category over time"
        >
          {data.months.map((month, mi) => {
            const x = mi * slot + (slot - barW) / 2;
            let yCursor = chartH;
            const total = data.monthTotals[mi]!;
            return (
              <g key={month}>
                {data.categories.map((cat, ci) => {
                  const cents = data.cells[mi]![ci]!;
                  if (cents <= 0) return null;
                  const h = (cents / max) * chartH;
                  yCursor -= h;
                  return (
                    <rect
                      key={cat}
                      x={x}
                      y={yCursor}
                      width={barW}
                      height={h}
                      fill="var(--color-ink)"
                      fillOpacity={RAMP[Math.min(ci, RAMP.length - 1)]}
                    />
                  );
                })}
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  className="fill-ink-faint"
                  style={{ fontSize: 9 }}
                >
                  {monthLabel(month)}
                </text>
                {total > 0 ? (
                  <text
                    x={x + barW / 2}
                    y={chartH - (total / max) * chartH - 3}
                    textAnchor="middle"
                    className="fill-ink-muted"
                    style={{ fontSize: 8 }}
                  >
                    {dollars(total)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {data.categories.map((cat, ci) => (
          <li key={cat} className="flex items-center gap-1.5 text-caption text-ink-muted">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm bg-ink"
              style={{ opacity: RAMP[Math.min(ci, RAMP.length - 1)] }}
            />
            {cat}
          </li>
        ))}
      </ul>
    </div>
  );
}
