"use client";

import type { GanttTick } from "@/lib/projects/gantt-scale";

import { GANTT_LABEL_WIDTH } from "./GanttRow";

const AXIS_HEIGHT = 28;

type Props = {
  ticks: GanttTick[];
  pxPerDay: number;
  boardWidth: number;
  labelWidth?: number;
};

export default function GanttAxis({
  ticks,
  pxPerDay,
  boardWidth,
  labelWidth = GANTT_LABEL_WIDTH,
}: Props) {
  return (
    <div
      className="sticky top-0 z-sticky flex"
      style={{ width: labelWidth + boardWidth, height: AXIS_HEIGHT }}
    >
      <div
        className="sticky left-0 z-overlay border-b border-border bg-surface"
        style={{ width: labelWidth, height: AXIS_HEIGHT }}
      />
      <div
        className="relative border-b border-border bg-surface"
        style={{ width: boardWidth, height: AXIS_HEIGHT }}
      >
        {ticks.map((tick) => (
          <div
            key={tick.dayOffset}
            className="absolute top-0 h-full border-l border-subtle"
            style={{ left: tick.dayOffset * pxPerDay }}
          >
            <span className="whitespace-nowrap pl-1 text-caption leading-7 text-ink-muted">
              {tick.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
