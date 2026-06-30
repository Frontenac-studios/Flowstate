"use client";

import {
  hasManualPhaseDate,
  resolveEffectivePhaseRange,
  type ProjectTree,
} from "@/lib/projects/phase-tree";

import GanttBar from "./GanttBar";
import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

export const GANTT_LABEL_WIDTH = 192;
export const GANTT_ROW_HEIGHT = 34;

type Props = {
  node: Node;
  depth: number;
  isLeaf: boolean;
  originIso: string;
  pxPerDay: number;
  boardWidth: number;
  color: string;
  onCommit: (phaseId: string, startIso: string, endIso: string) => void;
};

export default function GanttRow({
  node,
  depth,
  isLeaf,
  originIso,
  pxPerDay,
  boardWidth,
  color,
  onCommit,
}: Props) {
  const completed = node.phase.completedAt !== null;
  const range = resolveEffectivePhaseRange(node);
  const hasBar = range.start !== null && range.end !== null;
  const taskDerived = isLeaf && hasBar && !hasManualPhaseDate(node.phase);

  return (
    <div className="flex items-stretch" style={{ width: GANTT_LABEL_WIDTH + boardWidth }}>
      <div
        className="sticky left-0 z-10 flex items-center border-b border-subtle bg-surface text-sm"
        style={{ width: GANTT_LABEL_WIDTH, paddingLeft: 8 + depth * 14, height: GANTT_ROW_HEIGHT }}
      >
        <span className={`truncate ${completed ? "text-ink-muted line-through" : "text-ink"}`}>
          {node.phase.name}
        </span>
      </div>
      <div
        className="relative border-b border-subtle"
        style={{ width: boardWidth, height: GANTT_ROW_HEIGHT }}
      >
        {hasBar ? (
          <GanttBar
            startIso={range.start!}
            endIso={range.end!}
            originIso={originIso}
            pxPerDay={pxPerDay}
            color={color}
            locked={!isLeaf}
            taskDerived={taskDerived}
            completed={completed}
            label={node.phase.name}
            onCommit={isLeaf ? (start, end) => onCommit(node.phase.id, start, end) : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}
