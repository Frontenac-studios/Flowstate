"use client";

import type { PlanningBreadcrumb } from "@/lib/planning/horizon-storage";

type Props = {
  breadcrumb: PlanningBreadcrumb;
  onNavigate: (next: PlanningBreadcrumb) => void;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function segmentLabel(key: keyof PlanningBreadcrumb, value: number) {
  if (key === "year") return String(value);
  if (key === "quarter") return `Q${value}`;
  if (key === "month") return MONTH_NAMES[value - 1] ?? `M${value}`;
  if (key === "isoWeek") return `wk${value}`;
  return String(value);
}

export default function PlanBreadcrumb({ breadcrumb, onNavigate }: Props) {
  const segments: Array<{ key: keyof PlanningBreadcrumb; value: number }> = [
    { key: "year", value: breadcrumb.year },
  ];
  if (breadcrumb.quarter != null) segments.push({ key: "quarter", value: breadcrumb.quarter });
  if (breadcrumb.month != null) segments.push({ key: "month", value: breadcrumb.month });
  if (breadcrumb.isoWeek != null) segments.push({ key: "isoWeek", value: breadcrumb.isoWeek });

  return (
    <nav aria-label="Planning period" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {segments.map((seg, index) => {
          const isLast = index === segments.length - 1;

          return (
            <li key={seg.key} className="flex items-center gap-1">
              {index > 0 ? <span aria-hidden="true">›</span> : null}
              {isLast ? (
                <span className="font-medium text-ink">{segmentLabel(seg.key, seg.value)}</span>
              ) : (
                <button
                  type="button"
                  className="hover:text-ink"
                  onClick={() => {
                    if (seg.key === "year") onNavigate({ year: breadcrumb.year });
                    else if (seg.key === "quarter")
                      onNavigate({ year: breadcrumb.year, quarter: breadcrumb.quarter });
                    else if (seg.key === "month")
                      onNavigate({
                        year: breadcrumb.year,
                        quarter: breadcrumb.quarter,
                        month: breadcrumb.month,
                      });
                  }}
                >
                  {segmentLabel(seg.key, seg.value)}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
