"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { ProjectTree } from "@/lib/projects/phase-tree";

import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

type Props = {
  node: Node;
  parentPhaseId: string | null;
  isOpen: boolean;
  selected: boolean;
  focused: boolean;
  onOpen: () => void;
  onOpenDetail: () => void;
};

export default function MillerPhaseRow({
  node,
  parentPhaseId,
  isOpen,
  selected,
  focused,
  onOpen,
  onOpenDetail,
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
      className={`flex cursor-grab items-start gap-2 rounded-kash px-2 py-1.5 transition active:cursor-grabbing ${
        isOpen || selected ? "bg-kash-accent/15" : "hover:bg-white/40"
      } ${focused ? "ring-2 ring-inset ring-[var(--kash-accent-soft)]" : ""} ${
        isDragging ? "opacity-50" : ""
      } ${isOver ? "border-t-2 border-kash-accent" : "border-t-2 border-transparent"}`}
      {...listeners}
      {...dragAttributes}
    >
      <button
        type="button"
        onClick={onOpen}
        onDoubleClick={(e) => {
          e.preventDefault();
          onOpenDetail();
        }}
        className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left text-sm text-kash-ink"
      >
        <span className="min-w-0 flex-1 break-words font-medium">{node.phase.name}</span>
        {itemCount > 0 ? (
          <span className="mt-0.5 shrink-0 text-xs tabular-nums text-kash-ink-muted">
            {itemCount}
          </span>
        ) : null}
      </button>
    </li>
  );
}
