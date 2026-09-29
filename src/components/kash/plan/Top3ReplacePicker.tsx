"use client";

import { useEffect, useRef, useState } from "react";

import { MENU_ROW, OVERLAY_CARD } from "@/components/kash/ui/overlay-styles";
import { cn } from "@/lib/cn";

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

  // Track the anchor's position so the picker follows it on scroll/resize
  // instead of detaching from a one-time measurement.
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(
    () => anchorEl?.getBoundingClientRect() ?? null
  );

  useEffect(() => {
    if (!anchorEl) {
      setAnchorRect(null);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      setAnchorRect(anchorEl.getBoundingClientRect());
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    // Capture-phase scroll catches scrolling on any ancestor container.
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [anchorEl]);

  const top = anchorRect ? anchorRect.bottom + 8 : 80;
  const left = anchorRect ? anchorRect.left : 16;
  const width = anchorRect ? anchorRect.width : 320;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Replace a priority"
      className={cn(OVERLAY_CARD, "fixed z-modal flex flex-col gap-1")}
      style={{ top, left, width: Math.min(width, 400) }}
    >
      <p className="px-3 pb-1 pt-1.5 text-sm font-medium text-ink">Replace a priority</p>
      <div className="flex flex-col">
        {([1, 2, 3] as const).map((slot) => {
          const task = pinnedBySlot.get(slot);
          const label = SLOT_LABELS[slot - 1];
          return (
            <button key={slot} type="button" className={MENU_ROW} onClick={() => onReplace(slot)}>
              <span className="shrink-0 text-xs text-accent" aria-hidden>
                {label}
              </span>
              <span className="min-w-0 flex-1 truncate">{task?.title ?? `Slot ${slot}`}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="kash-focus-visible mt-1 rounded-row py-1 text-center text-xs text-ink-muted outline-none hover:text-ink"
        onClick={onDismiss}
      >
        Nevermind
      </button>
    </div>
  );
}
