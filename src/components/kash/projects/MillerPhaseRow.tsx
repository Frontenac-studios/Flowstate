"use client";

import { useDroppable } from "@dnd-kit/core";

import type { ProjectTree } from "@/lib/projects/phase-tree";

import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

type Props = {
  node: Node;
  isOpen: boolean;
  selected: boolean;
  focused: boolean;
  onOpen: () => void;
  onToggleComplete: () => void;
};

export default function MillerPhaseRow({
  node,
  isOpen,
  selected,
  focused,
  onOpen,
  onToggleComplete,
}: Props) {
  const completed = node.phase.completedAt !== null;
  const { setNodeRef, isOver } = useDroppable({
    id: `phasedrop:${node.phase.id}`,
    data: { kind: "phase", phaseId: node.phase.id },
  });

  return (
    <li
      ref={setNodeRef}
      data-miller-item
      className={`flex items-center gap-2 rounded-kash px-2 py-1.5 transition ${
        isOpen || selected ? "bg-kash-accent/15" : "hover:bg-white/40"
      } ${focused ? "ring-2 ring-[var(--kash-accent-soft)]" : ""} ${
        isOver ? "ring-2 ring-kash-accent" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggleComplete}
        onClick={(e) => e.stopPropagation()}
        aria-label={completed ? "Mark phase incomplete" : "Mark phase complete"}
        className="shrink-0"
      />
      <button
        type="button"
        onClick={onOpen}
        className={`flex flex-1 items-center justify-between gap-2 text-left text-sm ${
          completed ? "text-kash-ink-muted line-through" : "text-kash-ink"
        }`}
      >
        <span className="truncate font-medium">{node.phase.name}</span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-kash-ink-muted">
          {node.children.length + node.tasks.length > 0 ? (
            <span>
              {node.children.length > 0 ? `${node.children.length}▸ ` : ""}
              {node.tasks.length > 0 ? `${node.tasks.length}✓` : ""}
            </span>
          ) : null}
          <span aria-hidden>›</span>
        </span>
      </button>
    </li>
  );
}
