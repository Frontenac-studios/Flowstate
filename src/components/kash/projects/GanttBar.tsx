"use client";

import { useState } from "react";

import { dayIndex, offsetToDate } from "@/lib/projects/gantt-scale";

type DragMode = "move" | "resize-left" | "resize-right";

type DragState = {
  mode: DragMode;
  startClientX: number;
  startOffset: number;
  endOffset: number;
  previewStart: number;
  previewEnd: number;
};

type Props = {
  startIso: string;
  endIso: string;
  originIso: string;
  pxPerDay: number;
  color: string;
  /** Parent (derived) bars are read-only. */
  locked: boolean;
  /** Fully task-derived leaf bar (no manual DB dates). */
  taskDerived?: boolean;
  completed: boolean;
  label?: string;
  onCommit?: (startIso: string, endIso: string) => void;
};

export default function GanttBar({
  startIso,
  endIso,
  originIso,
  pxPerDay,
  color,
  locked,
  taskDerived = false,
  completed,
  label,
  onCommit,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const baseStartOffset = dayIndex(startIso, originIso);
  const baseEndOffset = dayIndex(endIso, originIso);

  const startOffset = drag ? drag.previewStart : baseStartOffset;
  const endOffset = drag ? drag.previewEnd : baseEndOffset;

  const left = startOffset * pxPerDay;
  const width = Math.max((endOffset - startOffset + 1) * pxPerDay, pxPerDay);

  const beginDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    if (locked) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({
      mode,
      startClientX: e.clientX,
      startOffset: baseStartOffset,
      endOffset: baseEndOffset,
      previewStart: baseStartOffset,
      previewEnd: baseEndOffset,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const deltaDays = Math.round((e.clientX - drag.startClientX) / pxPerDay);
    let previewStart = drag.startOffset;
    let previewEnd = drag.endOffset;
    if (drag.mode === "move") {
      previewStart = drag.startOffset + deltaDays;
      previewEnd = drag.endOffset + deltaDays;
    } else if (drag.mode === "resize-left") {
      previewStart = Math.min(drag.startOffset + deltaDays, drag.endOffset);
    } else {
      previewEnd = Math.max(drag.endOffset + deltaDays, drag.startOffset);
    }
    setDrag({ ...drag, previewStart, previewEnd });
  };

  const endDrag = () => {
    if (!drag) return;
    const changed = drag.previewStart !== drag.startOffset || drag.previewEnd !== drag.endOffset;
    if (changed && onCommit) {
      onCommit(
        offsetToDate(drag.previewStart, originIso),
        offsetToDate(drag.previewEnd, originIso)
      );
    }
    setDrag(null);
  };

  const opacity = completed ? 0.45 : locked ? 0.55 : 1;
  const height = locked ? 10 : 18;

  return (
    <div
      role={locked ? undefined : "button"}
      aria-label={locked ? undefined : `${label ?? "Phase"} bar — drag to move, edges to resize`}
      onPointerDown={locked ? undefined : beginDrag("move")}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`absolute top-1/2 flex -translate-y-1/2 items-center rounded-md ${
        locked ? "" : "cursor-grab active:cursor-grabbing"
      } ${completed ? "line-through" : ""} ${taskDerived ? "border border-dashed border-white/65" : ""} ${
        drag ? "shadow-overlay" : ""
      }`}
      style={{
        left,
        width,
        height,
        backgroundColor: color,
        opacity,
      }}
    >
      {!locked ? (
        <span
          onPointerDown={beginDrag("resize-left")}
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md"
          aria-hidden
        />
      ) : null}
      {label && width > 48 ? (
        <span className="pointer-events-none truncate px-2 text-xs font-medium text-white">
          {label}
        </span>
      ) : null}
      {!locked ? (
        <span
          onPointerDown={beginDrag("resize-right")}
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
