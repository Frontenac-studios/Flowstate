"use client";

import { useDroppable } from "@dnd-kit/core";

import type { ProjectTree } from "@/lib/projects/phase-tree";

import MillerPhaseRow from "./MillerPhaseRow";
import MillerTaskRow from "./MillerTaskRow";
import NewItemRow from "./NewItemRow";
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
  focusIndex: number | null;
  pending: boolean;
  onOpenPhase: (node: Node) => void;
  onSelectTask: (task: ProjectTask) => void;
  onTogglePhase: (node: Node) => void;
  onToggleTask: (task: ProjectTask) => void;
  onCreateTask: (title: string) => void;
  onCreatePhase: (name: string) => void;
};

export default function MillerColumn({
  level,
  parentPhaseId,
  items,
  openPhaseId,
  detail,
  focusIndex,
  pending,
  onOpenPhase,
  onSelectTask,
  onTogglePhase,
  onToggleTask,
  onCreateTask,
  onCreatePhase,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${level}`,
    data: { kind: "column", parentPhaseId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-kash p-2 transition ${
        isOver ? "bg-kash-accent/10" : ""
      }`}
    >
      <ul className="flex flex-col gap-0.5">
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
                onToggleComplete={() => onTogglePhase(item.node)}
              />
            );
          }
          return (
            <MillerTaskRow
              key={`t:${item.task.id}`}
              task={item.task}
              parentPhaseId={parentPhaseId}
              selected={detail?.type === "task" && detail.id === item.task.id}
              focused={focused}
              onSelect={() => onSelectTask(item.task)}
              onToggleComplete={() => onToggleTask(item.task)}
            />
          );
        })}
      </ul>
      <NewItemRow onCreateTask={onCreateTask} onCreatePhase={onCreatePhase} pending={pending} />
    </div>
  );
}
