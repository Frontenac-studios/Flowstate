"use client";

import { Fragment, type ReactNode } from "react";

import { useDroppable } from "@dnd-kit/core";

import type { ProjectCategory } from "@/lib/projects/categories";
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
  category: ProjectCategory;
  items: ColumnItem[];
  openPhaseId: string | null;
  detail: DetailSelection;
  focusIndex: number | null;
  isActive: boolean;
  shellClassName?: string;
  hint?: string;
  renderDetail: (item: ColumnItem) => ReactNode;
  onOpenPhase: (node: Node) => void;
  onOpenTaskDetail: (task: ProjectTask) => void;
  onToggleTask: (task: ProjectTask) => void;
};

export default function MillerColumn({
  level,
  parentPhaseId,
  category,
  items,
  openPhaseId,
  detail,
  focusIndex,
  isActive,
  shellClassName = "w-64 shrink-0 min-h-60 flex h-full min-h-0 flex-col self-stretch",
  hint,
  renderDetail,
  onOpenPhase,
  onOpenTaskDetail,
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
      } ${isOver ? "bg-[var(--surface-selected)]" : ""}`}
    >
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
        {items.map((item, index) => {
          const focused = focusIndex === index;
          if (item.kind === "phase") {
            const expanded = detail?.type === "phase" && detail.id === item.node.phase.id;
            return (
              <Fragment key={`p:${item.node.phase.id}`}>
                <MillerPhaseRow
                  node={item.node}
                  parentPhaseId={parentPhaseId}
                  category={category}
                  isOpen={openPhaseId === item.node.phase.id}
                  selected={expanded}
                  focused={focused}
                  onOpen={() => onOpenPhase(item.node)}
                />
                {expanded ? (
                  <li
                    data-miller-detail
                    className="mb-1 rounded-row border border-subtle bg-surface-2 p-3"
                  >
                    {renderDetail(item)}
                  </li>
                ) : null}
              </Fragment>
            );
          }
          const expanded = detail?.type === "task" && detail.id === item.task.id;
          return (
            <Fragment key={`t:${item.task.id}`}>
              <MillerTaskRow
                task={item.task}
                parentPhaseId={parentPhaseId}
                selected={expanded}
                focused={focused}
                onOpenDetail={() => onOpenTaskDetail(item.task)}
                onToggleComplete={() => onToggleTask(item.task)}
              />
              {expanded ? (
                <li
                  data-miller-detail
                  className="mb-1 rounded-row border border-subtle bg-surface-2 p-3"
                >
                  {renderDetail(item)}
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ul>
      {hint && items.length === 0 ? (
        <p className="mt-1 px-2 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
