"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { ChevronRight, kashIconProps } from "@/components/kash/ui/icon";
import type { ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectTree } from "@/lib/projects/phase-tree";
import { formatDuration } from "@/lib/time/duration";

import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

type Props = {
  node: Node;
  parentPhaseId: string | null;
  category: ProjectCategory;
  isOpen: boolean;
  selected: boolean;
  focused: boolean;
  progressPercent?: number;
  timeSpentSeconds?: number;
  onOpen: () => void;
};

export default function MillerPhaseRow({
  node,
  parentPhaseId,
  category,
  isOpen,
  selected,
  focused,
  progressPercent,
  timeSpentSeconds = 0,
  onOpen,
}: Props) {
  const itemCount = node.children.length + node.tasks.length;
  const stripe = categorySolidVar(category);
  const showProgress = itemCount > 0 && progressPercent !== undefined;
  const timeLabel = timeSpentSeconds > 0 ? formatDuration(timeSpentSeconds) : null;

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
      className={`flex cursor-grab flex-col gap-1 rounded-card px-2 py-1.5 transition active:cursor-grabbing ${
        isOpen || selected ? "bg-[var(--surface-selected)]" : "hover:bg-surface"
      } ${focused ? "ring-2 ring-inset ring-[var(--accent-soft)]" : ""} ${
        isDragging ? "opacity-50" : ""
      } ${isOver ? "ring-1 ring-inset ring-ink" : ""}`}
      {...listeners}
      {...dragAttributes}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={selected}
        className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left text-sm text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
      >
        <span className="flex min-w-0 flex-1 items-start gap-1.5">
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: stripe,
              boxShadow: "0 0 0 1px var(--mark-ring)",
            }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 break-words font-medium">{node.phase.name}</span>
        </span>
        <span className="mt-0.5 flex shrink-0 items-center gap-1">
          {timeLabel ? (
            <span className="text-xs tabular-nums text-ink-faint">{timeLabel}</span>
          ) : null}
          {itemCount > 0 ? (
            <span className="text-xs tabular-nums text-ink-muted">{itemCount}</span>
          ) : null}
          <ChevronRight
            {...kashIconProps({
              tokenSize: "sm",
              className: `shrink-0 transition-transform ${isOpen ? "rotate-90 text-ink" : "text-ink-faint"}`,
              "aria-hidden": true,
            })}
          />
        </span>
      </button>
      {showProgress ? (
        <div className="h-0.5 overflow-hidden rounded-full bg-border">
          <span
            className="block h-full rounded-full"
            style={{ width: `${progressPercent}%`, backgroundColor: stripe }}
          />
        </div>
      ) : null}
    </li>
  );
}
