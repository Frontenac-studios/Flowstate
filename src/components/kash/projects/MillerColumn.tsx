"use client";

import { Fragment, useId, useState, type ReactNode } from "react";

import { useDroppable } from "@dnd-kit/core";

import { ChevronRight, kashIconProps } from "@/components/kash/ui/icon";

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
  onSelectTask: (task: ProjectTask, index: number) => void;
  onToggleTaskDetail: (task: ProjectTask) => void;
  onToggleTask: (task: ProjectTask) => void;
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
  onSelectTask,
  onToggleTaskDetail,
  onToggleTask,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${level}`,
    data: { kind: "column", parentPhaseId },
  });
  const completedPanelId = useId();
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

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

  // Keyboard focus lands on a completed row → force the group open so it's visible.
  const focusInCompleted =
    focusIndex !== null && completedItems.some((entry) => entry.index === focusIndex);
  const completedExpanded = !completedCollapsed || focusInCompleted;

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
          <li className="mt-1">
            <button
              type="button"
              className="kash-focus-visible flex w-full items-center gap-1.5 rounded-row px-1.5 py-1 text-left outline-none"
              aria-expanded={completedExpanded}
              aria-controls={completedPanelId}
              onClick={() => setCompletedCollapsed((value) => !value)}
            >
              <ChevronRight
                {...kashIconProps({
                  tokenSize: "sm",
                  className: `text-ink-faint transition-transform duration-short ease-enter motion-reduce:transition-none ${
                    completedExpanded ? "rotate-90" : ""
                  }`,
                })}
                aria-hidden
              />
              <span className="text-caption font-medium uppercase tracking-wide text-ink-muted">
                Completed
              </span>
              <span className="text-caption text-ink-faint">· {completedItems.length}</span>
            </button>
            <ul
              id={completedPanelId}
              hidden={!completedExpanded}
              className="mt-0.5 flex flex-col gap-0.5"
            >
              {completedItems.map(({ item, index }) => renderItem(item, index))}
            </ul>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
