"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectTree } from "@/lib/projects/phase-tree";

import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

type Props = {
  node: Node;
  parentPhaseId: string | null;
  category: ProjectCategory;
  isOpen: boolean;
  selected: boolean;
  focused: boolean;
  onOpen: () => void;
};

export default function MillerPhaseRow({
  node,
  parentPhaseId,
  category,
  isOpen,
  selected,
  focused,
  onOpen,
}: Props) {
  const itemCount = node.children.length + node.tasks.length;
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `phase:${node.phase.id}`,
    data: { kind: "phase-drag", phaseId: node.phase.id, parentPhaseId },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `phasedrop:${node.phase.id}`,
    data: { kind: "phase", phaseId: node.phase.id, parentPhaseId },
  });

  const { tabIndex: _tab, role: _role, ...dragAttributes } = attributes;
  void _tab;
  void _role;

  const setRefs = (el: HTMLLIElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  return (
    <li
      ref={setRefs}
      data-miller-item
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex cursor-grab items-start gap-2 rounded-card px-2 py-1.5 transition active:cursor-grabbing ${
        isOpen || selected ? "bg-[var(--surface-selected)]" : "hover:bg-surface"
      } ${focused ? "ring-2 ring-inset ring-[var(--accent-soft)]" : ""} ${
        isDragging ? "opacity-50" : ""
      } ${isOver ? "border-t-2 border-ink" : "border-t-2 border-transparent"}`}
      {...listeners}
      {...dragAttributes}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={selected}
        className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left text-sm text-ink"
      >
        <span className="flex min-w-0 flex-1 items-start gap-1.5">
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: categorySolidVar(category) }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 break-words font-medium">{node.phase.name}</span>
        </span>
        <span className="mt-0.5 flex shrink-0 items-center gap-1">
          {itemCount > 0 ? (
            <span className="text-xs tabular-nums text-ink-muted">{itemCount}</span>
          ) : null}
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "text-ink" : "text-ink-faint"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </button>
    </li>
  );
}
