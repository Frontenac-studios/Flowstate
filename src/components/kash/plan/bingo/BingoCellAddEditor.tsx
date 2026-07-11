"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { ProjectCategory } from "@/lib/projects/categories";

import CategoryPillPicker from "./CategoryPillPicker";
import ValuePillPicker from "./ValuePillPicker";

type Props = {
  busy: boolean;
  error: string | null;
  inWinningLine: boolean;
  locking?: boolean;
  onSubmit: (title: string, category: ProjectCategory, valueId: string | null) => void;
  onCancel: () => void;
};

const POPOVER_MIN_HEIGHT = 220;
const POPOVER_GAP = 8;

export default function BingoCellAddEditor({
  busy,
  error,
  inWinningLine,
  locking = false,
  onSubmit,
  onCancel,
}: Props) {
  const formId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [valueId, setValueId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && category !== null && !busy;

  const ring = inWinningLine ? "shadow-[0_0_0_2px_var(--ink)]" : "";
  const lockable = locking ? "bingo-cell-lockable" : "";

  const updatePlacement = useCallback(() => {
    const cell = containerRef.current;
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP;
    const spaceAbove = rect.top - POPOVER_GAP;
    if (spaceBelow < POPOVER_MIN_HEIGHT && spaceAbove > spaceBelow) {
      setPlacement("above");
    } else {
      setPlacement("below");
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [updatePlacement]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      onCancel();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || category === null) return;
    onSubmit(trimmed, category, valueId);
  };

  const popoverPosition =
    placement === "below"
      ? { top: "calc(100% + 0.5rem)" as const }
      : { bottom: "calc(100% + 0.5rem)" as const };

  return (
    <div ref={containerRef} className={`relative ${lockable}`}>
      <div
        className={`flex aspect-square flex-col justify-center rounded-card border border-dashed border-ink-muted bg-surface p-1.5 shadow-surface ${ring}`}
      >
        <input
          ref={inputRef}
          form={formId}
          className="w-full min-w-0 bg-transparent text-meta font-medium text-ink outline-none placeholder:text-ink-faint focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal…"
          maxLength={500}
          aria-label="Goal title"
        />
      </div>

      <div
        role="dialog"
        aria-label="Add goal"
        className="absolute left-0 z-overlay min-w-[14rem] max-w-[min(20rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-3 shadow-overlay"
        style={popoverPosition}
      >
        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <CategoryPillPicker value={category} onChange={setCategory} />
          <ValuePillPicker value={valueId} onChange={setValueId} />

          {error ? (
            <p role="alert" className="text-caption text-critical">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-control border-emphasis border-ink px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
            >
              {busy ? "Adding…" : "Add goal"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-control px-3 py-1.5 text-caption text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
