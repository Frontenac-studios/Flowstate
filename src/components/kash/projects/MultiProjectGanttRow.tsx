"use client";

import Link from "next/link";

import type { MultiProjectCalendarRow } from "@/lib/projects/multi-project-calendar";

import GanttBar from "./GanttBar";

export const MULTI_GANTT_LABEL_WIDTH = 280;
export const MULTI_GANTT_ROW_HEIGHT = 34;

type Props = {
  row: MultiProjectCalendarRow;
  originIso: string;
  pxPerDay: number;
  boardWidth: number;
  color: string;
  showProjectName: boolean;
};

export default function MultiProjectGanttRow({
  row,
  originIso,
  pxPerDay,
  boardWidth,
  color,
  showProjectName,
}: Props) {
  return (
    <div className="flex items-stretch" style={{ width: MULTI_GANTT_LABEL_WIDTH + boardWidth }}>
      <div
        className="sticky left-0 z-sticky flex flex-col justify-center border-b border-subtle bg-surface text-sm"
        style={{
          width: MULTI_GANTT_LABEL_WIDTH,
          paddingLeft: 8 + row.depth * 14,
          height: MULTI_GANTT_ROW_HEIGHT,
        }}
      >
        {showProjectName ? (
          <Link
            href={`/projects/${row.projectId}`}
            className="truncate text-xs font-medium text-ink-muted hover:text-accent hover:underline"
          >
            {row.projectName}
          </Link>
        ) : null}
        <span className={`truncate ${row.completed ? "text-ink-muted line-through" : "text-ink"}`}>
          {row.phaseName}
        </span>
      </div>
      <div
        className="relative border-b border-subtle"
        style={{ width: boardWidth, height: MULTI_GANTT_ROW_HEIGHT }}
      >
        <GanttBar
          startIso={row.start}
          endIso={row.end}
          originIso={originIso}
          pxPerDay={pxPerDay}
          color={color}
          locked
          completed={row.completed}
          label={row.phaseName}
        />
      </div>
    </div>
  );
}
