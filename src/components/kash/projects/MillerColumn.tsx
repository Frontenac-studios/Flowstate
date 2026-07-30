"use client";

import { Fragment, type ReactNode } from "react";

import { useDroppable } from "@dnd-kit/core";

import type { ProjectCategory } from "@/lib/projects/categories";
import type { ProjectTree } from "@/lib/projects/phase-tree";

import { MILLER_COLUMN_WIDTH_CLASS, millerColumnShellClass } from "./miller-columns";
import MillerPhaseRow from "./MillerPhaseRow";
import MillerTaskRow from "./MillerTaskRow";
import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

export type ColumnItem = { kind: "phase"; node: Node } | { kind: "task"; task: ProjectTask };

export type DetailSelection = { type: "phase" | "task"; id: string } | null;

export type PhaseMetrics = {
  percent: number;
  timeSpentSeconds: number;
};

type Props = {
  projectId: string;
  level: number;
  parentPhaseId: string | null;
  category: ProjectCategory;
  items: ColumnItem[];
  openPhaseId: string | null;
  detail: DetailSelection;
  focusIndex: number | null;
  isActive: boolean;
  shellClassName?: string;
  phaseMetrics?: Map<string, PhaseMetrics>;
  /** Chat-created task ids to pulse (post-create feedback, P6). */
  highlightTaskIds?: Set<string>;
  blankInvitation?: ReactNode;
  renderDetail: (item: ColumnItem) => ReactNode;
  onDrillPhase: (node: Node) => void;
  onEditPhase: (node: Node) => void;
  onTogglePhaseComplete: (node: Node) => void;
  onSelectTask: (task: ProjectTask, index: number) => void;
  onToggleTaskDetail: (task: ProjectTask) => void;
  onToggleTask: (task: ProjectTask) => void;
  onRequestDeleteTask: (task: ProjectTask) => void;
};

function isItemComplete(item: ColumnItem): boolean {
  return item.kind === "phase"
    ? item.node.phase.completedAt !== null
    : item.task.completedAt !== null;
}

export default function MillerColumn({
  projectId,
  level,
  parentPhaseId,
  category,
  items,
  openPhaseId,
  detail,
  focusIndex,
  isActive,
  shellClassName = millerColumnShellClass(MILLER_COLUMN_WIDTH_CLASS),
  phaseMetrics,
  highlightTaskIds,
  blankInvitation,
  renderDetail,
  onDrillPhase,
  onEditPhase,
  onTogglePhaseComplete,
  onSelectTask,
  onToggleTaskDetail,
  onToggleTask,
  onRequestDeleteTask,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${level}`,
    data: { kind: "column", parentPhaseId },
  });

  const renderItem = (item: ColumnItem, index: number): ReactNode => {
    const focused = focusIndex === index;
    if (item.kind === "phase") {
      const expanded = detail?.type === "phase" && detail.id === item.node.phase.id;
      const metrics = phaseMetrics?.get(item.node.phase.id);
      return (
        <Fragment key={`p:${item.node.phase.id}`}>
          <MillerPhaseRow
            node={item.node}
            parentPhaseId={parentPhaseId}
            category={category}
            isOpen={openPhaseId === item.node.phase.id}
            selected={expanded}
            focused={focused}
            progressPercent={metrics?.percent}
            timeSpentSeconds={metrics?.timeSpentSeconds}
            onOpen={() => onDrillPhase(item.node)}
            onEdit={() => onEditPhase(item.node)}
            onToggleComplete={() => onTogglePhaseComplete(item.node)}
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
    const highlighted = highlightTaskIds?.has(item.task.id) ?? false;
    return (
      <Fragment key={`t:${item.task.id}`}>
        <MillerTaskRow
          projectId={projectId}
          task={item.task}
          parentPhaseId={parentPhaseId}
          selected={expanded}
          focused={focused}
          onSelect={() => onSelectTask(item.task, index)}
          onToggleDetail={() => onToggleTaskDetail(item.task)}
          onToggleComplete={() => onToggleTask(item.task)}
          onRequestDelete={() => onRequestDeleteTask(item.task)}
          highlightClassName={highlighted ? "kash-section-pulse" : undefined}
        />
        {expanded ? (
          <li data-miller-detail className="mb-1 rounded-row border border-subtle bg-surface-2 p-3">
            {renderDetail(item)}
          </li>
        ) : null}
      </Fragment>
    );
  };

  const activeItems: { item: ColumnItem; index: number }[] = [];
  const completedItems: { item: ColumnItem; index: number }[] = [];
  items.forEach((item, index) => {
    (isItemComplete(item) ? completedItems : activeItems).push({ item, index });
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-card border bg-surface p-2 shadow-surface transition ${shellClassName} ${
        isActive ? "border-ink" : "border-subtle"
      } ${isOver ? "ring-1 ring-inset ring-ink" : ""}`}
    >
      {blankInvitation}
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
        {activeItems.map(({ item, index }) => renderItem(item, index))}
        {completedItems.length > 0 ? (
          <>
            {/*
              Push the completed group to the column's bottom. `grow` fills the slack
              when the column isn't full; `min-h-14` keeps a 2–3 row gap once content
              overflows and the column scrolls, so completed never crowds the last
              active item.
            */}
            <li aria-hidden className="min-h-14 shrink-0 grow" />
            <li className="mt-1 flex items-center gap-1.5 px-1.5 py-1">
              <span className="text-caption font-medium uppercase tracking-wide text-ink-muted">
                Completed
              </span>
              <span className="text-caption text-ink-faint">· {completedItems.length}</span>
              <span className="ml-1.5 h-px flex-1 bg-border" aria-hidden />
            </li>
            <li>
              {/* Dimmed so done work reads as settled; swipe a row to mark it not done. */}
              <ul className="flex flex-col gap-0.5 opacity-70">
                {completedItems.map(({ item, index }) => renderItem(item, index))}
              </ul>
            </li>
          </>
        ) : null}
      </ul>
    </div>
  );
}
