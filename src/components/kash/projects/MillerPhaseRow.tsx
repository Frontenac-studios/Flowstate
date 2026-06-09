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
  onOpenDetail: () => void;
};

export default function MillerPhaseRow({
  node,
  isOpen,
  selected,
  focused,
  onOpen,
  onOpenDetail,
}: Props) {
  const itemCount = node.children.length + node.tasks.length;
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
      } ${focused ? "ring-2 ring-inset ring-[var(--kash-accent-soft)]" : ""} ${
        isOver ? "ring-2 ring-inset ring-kash-accent" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        onDoubleClick={(e) => {
          e.preventDefault();
          onOpenDetail();
        }}
        className="flex flex-1 items-center justify-between gap-2 text-left text-sm text-kash-ink"
      >
        <span className="truncate font-medium">{node.phase.name}</span>
        {itemCount > 0 ? (
          <span className="shrink-0 text-xs tabular-nums text-kash-ink-muted">{itemCount}</span>
        ) : null}
      </button>
    </li>
  );
}
