"use client";

import type { GanttTick } from "@/lib/projects/gantt-scale";

import { GANTT_LABEL_WIDTH } from "./GanttRow";

const AXIS_HEIGHT = 28;

type Props = {
  ticks: GanttTick[];
  pxPerDay: number;
  boardWidth: number;
};

export default function GanttAxis({ ticks, pxPerDay, boardWidth }: Props) {
  return (
    <div
      className="sticky top-0 z-20 flex"
      style={{ width: GANTT_LABEL_WIDTH + boardWidth, height: AXIS_HEIGHT }}
    >
      <div
        className="sticky left-0 z-30 border-b border-white/40 bg-[var(--surface)]"
        style={{ width: GANTT_LABEL_WIDTH, height: AXIS_HEIGHT }}
      />
      <div
        className="relative border-b border-white/40 bg-[var(--surface)]"
        style={{ width: boardWidth, height: AXIS_HEIGHT }}
      >
        {ticks.map((tick) => (
          <div
            key={tick.dayOffset}
            className="absolute top-0 h-full border-l border-white/40"
            style={{ left: tick.dayOffset * pxPerDay }}
          >
            <span className="whitespace-nowrap pl-1 text-[11px] leading-7 text-ink-muted">
              {tick.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
