"use client";

import { useEffect, useRef } from "react";

import type { Top3SlotTask } from "./Top3Slots";

const SLOT_LABELS = ["①", "②", "③"] as const;

type Props = {
  pinnedBySlot: Map<number, Top3SlotTask>;
  anchorEl: HTMLElement | null;
  onReplace: (slot: 1 | 2 | 3) => void;
  onDismiss: () => void;
};

export function Top3ReplacePicker({ pinnedBySlot, anchorEl, onReplace, onDismiss }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onDismiss]);

  const anchorRect = anchorEl?.getBoundingClientRect();
  const top = anchorRect ? anchorRect.bottom + 8 : 80;
  const left = anchorRect ? anchorRect.left : 16;
  const width = anchorRect ? anchorRect.width : 320;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Replace a priority"
      className="glass-panel-opaque fixed z-50 flex flex-col gap-2 p-3 shadow-lg"
      style={{ top, left, width: Math.min(width, 400) }}
    >
      <p className="text-sm font-medium text-kash-ink">Replace a priority</p>
      <div className="flex flex-col gap-1">
        {([1, 2, 3] as const).map((slot) => {
          const task = pinnedBySlot.get(slot);
          const label = SLOT_LABELS[slot - 1];
          return (
            <button
              key={slot}
              type="button"
              className="glass-pill flex min-h-9 items-center gap-2 px-3 py-kash-task-y-compact text-left text-sm text-kash-ink hover:ring-2 hover:ring-[var(--kash-accent-soft)]"
              onClick={() => onReplace(slot)}
            >
              <span className="shrink-0 text-xs text-kash-accent" aria-hidden>
                {label}
              </span>
              <span className="min-w-0 flex-1 truncate">{task?.title ?? `Slot ${slot}`}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="mt-1 text-center text-xs text-kash-ink-muted hover:text-kash-ink"
        onClick={onDismiss}
      >
        Nevermind
      </button>
    </div>
  );
}
