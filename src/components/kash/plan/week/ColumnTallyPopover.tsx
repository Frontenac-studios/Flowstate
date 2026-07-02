"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { BalanceBar } from "@/components/kash/plan/BalanceBar";
import type { PlanTaskRow } from "@/components/kash/plan/TaskRow";

import type { OverCommitThresholdMode } from "@/lib/week/over-commit-threshold";

import OverCommitFlag from "./OverCommitFlag";

type Props = {
  label: string;
  headerDate: string;
  isToday: boolean;
  tasks: PlanTaskRow[];
  overCommitted?: boolean;
  overCommitMode?: OverCommitThresholdMode;
  categoryStrip?: ReactNode;
  droppableRef: (node: HTMLElement | null) => void;
  isDropOver: boolean;
  children: ReactNode;
};

function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return canHover;
}

/**
 * Week day column shell (D19–D21): persistent category strip in header; balance
 * detail on hover/tap when the day has tasks.
 */
export default function ColumnTallyPopover({
  label,
  headerDate,
  isToday,
  tasks,
  droppableRef,
  isDropOver,
  overCommitted = false,
  overCommitMode = "cold-start",
  categoryStrip,
  children,
}: Props) {
  const tallyId = useId();
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasTasks = tasks.length > 0;
  const showTally = open && hasTasks;

  const openTally = useCallback(() => {
    if (hasTasks) setOpen(true);
  }, [hasTasks]);

  const closeTally = useCallback(() => setOpen(false), []);

  const toggleTally = useCallback(() => {
    if (!hasTasks) return;
    setOpen((prev) => !prev);
  }, [hasTasks]);

  useEffect(() => {
    if (!open || canHover) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (columnRef.current?.contains(target)) return;
      closeTally();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, canHover, closeTally]);

  useEffect(() => {
    if (!open || !canHover) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTally();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, canHover, closeTally]);

  return (
    <div
      ref={columnRef}
      className="relative flex shrink-0 flex-col"
      onMouseEnter={canHover ? openTally : undefined}
      onMouseLeave={canHover ? closeTally : undefined}
    >
      <div
        ref={droppableRef}
        className={`relative rounded-t-card ${isDropOver ? "outline-dashed outline-1 outline-[var(--accent)]" : ""}`}
      >
        {showTally ? (
          <div
            ref={panelRef}
            id={tallyId}
            role="region"
            aria-label={`${label} category balance`}
            className="absolute bottom-full left-1/2 z-overlay mb-2 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-card border border-subtle bg-surface p-3 shadow-overlay"
          >
            <BalanceBar tasks={tasks} />
          </div>
        ) : null}

        <button
          ref={headerRef}
          type="button"
          className={`w-full px-2 py-2 text-center focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] ${
            hasTasks && !canHover ? "cursor-pointer" : "cursor-default"
          }`}
          aria-expanded={hasTasks ? open : undefined}
          aria-controls={hasTasks ? tallyId : undefined}
          onClick={canHover ? undefined : toggleTally}
        >
          {categoryStrip ? <div className="mb-2">{categoryStrip}</div> : null}
          <p
            className={`text-caption uppercase tracking-wide ${
              isToday ? "font-medium text-ink" : "text-ink-faint"
            }`}
          >
            {label}
          </p>
          {isToday ? (
            <p className="mt-0.5">
              <span className="text-on-accent inline-block rounded-pill bg-ink px-2 py-0.5 text-caption font-medium">
                {headerDate}
              </span>
            </p>
          ) : (
            <p className="text-meta text-ink-muted">{headerDate}</p>
          )}
          {overCommitted ? <OverCommitFlag mode={overCommitMode} /> : null}
        </button>
      </div>

      {children}
    </div>
  );
}
