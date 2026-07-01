"use client";

import { useMemo } from "react";

import { buildMonthCalendarGrid } from "@/lib/planning/month-calendar";
import { monthShortName } from "@/lib/planning/quarter-months";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { toISODateString } from "@/lib/dates/local-day";

type Block = {
  id: string;
  scheduledDate: string;
  label: string | null;
  category: ProjectCategory;
  status: "proposed" | "confirmed";
};

type ReservedDay = {
  id: string;
  resolvedDate: string | null;
  label: string | null;
  type: "outside" | "personal";
};

type Props = {
  year: number;
  month: number;
  protectedBlocks: Block[];
  reservedDays: ReservedDay[];
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthCalendarView({ year, month, protectedBlocks, reservedDays }: Props) {
  const todayIso = toISODateString(new Date());
  const grid = useMemo(() => buildMonthCalendarGrid(year, month), [year, month]);

  const markersByDate = useMemo(() => {
    const map = new Map<
      string,
      Array<{ label: string; dashed: boolean; category?: ProjectCategory }>
    >();

    for (const block of protectedBlocks) {
      const list = map.get(block.scheduledDate) ?? [];
      list.push({
        label: block.label ?? "Protected",
        dashed: block.status === "proposed",
        category: block.category,
      });
      map.set(block.scheduledDate, list);
    }

    for (const day of reservedDays) {
      if (!day.resolvedDate) continue;
      const list = map.get(day.resolvedDate) ?? [];
      list.push({ label: day.label ?? day.type, dashed: false });
      map.set(day.resolvedDate, list);
    }

    return map;
  }, [protectedBlocks, reservedDays]);

  return (
    <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink">
        {monthShortName(month)} {year}
      </h3>

      <div className="grid grid-cols-7 gap-1 text-center text-caption text-ink-muted">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell) => {
          const markers = markersByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === todayIso;

          return (
            <div
              key={cell.iso}
              className={`min-h-[72px] rounded-control border p-1 text-left ${
                cell.inMonth
                  ? "border-subtle bg-surface-2"
                  : "border-transparent bg-transparent opacity-40"
              } ${isToday ? "ring-1 ring-accent" : ""}`}
            >
              <span className={`text-caption ${cell.inMonth ? "text-ink" : "text-ink-faint"}`}>
                {cell.day}
              </span>
              <ul className="mt-1 flex flex-col gap-0.5">
                {markers.slice(0, 2).map((marker, index) => (
                  <li
                    key={`${cell.iso}-${index}`}
                    className={`truncate rounded px-1 text-caption ${
                      marker.dashed
                        ? "border-ink/25 text-ink/70 border border-dashed"
                        : "bg-surface text-ink-muted"
                    }`}
                    style={
                      marker.category
                        ? { borderLeftWidth: 2, borderLeftColor: categorySolidVar(marker.category) }
                        : undefined
                    }
                  >
                    {marker.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
