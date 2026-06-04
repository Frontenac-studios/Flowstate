"use client";

import { useDroppable } from "@dnd-kit/core";

import type { ProjectTree } from "@/lib/projects/phase-tree";

import MillerPhaseRow from "./MillerPhaseRow";
import MillerTaskRow from "./MillerTaskRow";
import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

export type ColumnItem = { kind: "phase"; node: Node } | { kind: "task"; task: ProjectTask };

export type DetailSelection = { type: "phase" | "task"; id: string } | null;

type Props = {
  level: number;
  parentPhaseId: string | null;
  items: ColumnItem[];
  openPhaseId: string | null;
  detail: DetailSelection;
  selection: DetailSelection;
  focusIndex: number | null;
  isActive: boolean;
  shellClassName?: string;
  hint?: string;
  onOpenPhase: (node: Node) => void;
  onOpenPhaseDetail: (node: Node) => void;
  onHighlightTask: (task: ProjectTask) => void;
  onOpenTaskDetail: (task: ProjectTask) => void;
  onTogglePhase: (node: Node) => void;
  onToggleTask: (task: ProjectTask) => void;
};

export default function MillerColumn({
  level,
  parentPhaseId,
  items,
  openPhaseId,
  detail,
  selection,
  focusIndex,
  isActive,
  shellClassName = "w-64 shrink-0 min-h-60 flex h-full min-h-0 flex-col self-stretch",
  hint,
  onOpenPhase,
  onOpenPhaseDetail,
  onHighlightTask,
  onOpenTaskDetail,
  onTogglePhase,
  onToggleTask,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${level}`,
    data: { kind: "column", parentPhaseId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`miller-column-card p-2 transition ${shellClassName} ${
        isActive ? "miller-column-card-active" : ""
      } ${isOver ? "bg-kash-accent/10" : ""}`}
    >
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
        {items.map((item, index) => {
          const focused = focusIndex === index;
          if (item.kind === "phase") {
            return (
              <MillerPhaseRow
                key={`p:${item.node.phase.id}`}
                node={item.node}
                isOpen={openPhaseId === item.node.phase.id}
                selected={detail?.type === "phase" && detail.id === item.node.phase.id}
                focused={focused}
                onOpen={() => onOpenPhase(item.node)}
                onOpenDetail={() => onOpenPhaseDetail(item.node)}
                onToggleComplete={() => onTogglePhase(item.node)}
              />
            );
          }
          return (
            <MillerTaskRow
              key={`t:${item.task.id}`}
              task={item.task}
              parentPhaseId={parentPhaseId}
              selected={selection?.type === "task" && selection.id === item.task.id}
              focused={focused}
              onHighlight={() => onHighlightTask(item.task)}
              onOpenDetail={() => onOpenTaskDetail(item.task)}
              onToggleComplete={() => onToggleTask(item.task)}
            />
          );
        })}
      </ul>
      {hint && items.length === 0 ? (
        <p className="mt-1 px-2 text-xs text-kash-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
