"use client";

import { useDroppable } from "@dnd-kit/core";
import type { CSSProperties, ReactNode } from "react";

import { CalendarPlus, Check, Trash2, kashIconProps } from "@/components/kash/ui/icon";
import {
  TRIAGE_BIN_DONE_ID,
  TRIAGE_BIN_DROP_ID,
  TRIAGE_BIN_LATER_ID,
} from "@/lib/morning-handoff/triage-drag";

type BinProps = {
  id: string;
  icon: ReactNode;
  label: string;
  style: CSSProperties;
};

function Bin({ id, icon, label, style }: BinProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-row border border-dashed p-2 text-center transition ${
        isOver ? "shadow-[inset_0_0_0_2px_var(--accent-soft)]" : ""
      }`}
      style={style}
    >
      <span aria-hidden>{icon}</span>
      <span className="text-caption font-medium">{label}</span>
    </div>
  );
}

/**
 * Sorting bins shown over the bottom of the chat pane only while a triage
 * drag is active (the pane is `relative`; this overlay adds no layout shift).
 */
export function TriageDragBins() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 bg-surface pt-[var(--space-2)]">
      <Bin
        id={TRIAGE_BIN_LATER_ID}
        icon={<CalendarPlus {...kashIconProps({ tokenSize: "sm" })} />}
        label="Later this week"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--accent-soft)",
          color: "var(--ink-muted)",
        }}
      />
      <Bin
        id={TRIAGE_BIN_DONE_ID}
        icon={<Check {...kashIconProps({ tokenSize: "sm" })} />}
        label="Done"
        style={{
          borderColor: "var(--cat-body-mind-solid)",
          backgroundColor: "var(--cat-body-mind-fill)",
          color: "var(--cat-body-mind-text)",
        }}
      />
      <Bin
        id={TRIAGE_BIN_DROP_ID}
        icon={<Trash2 {...kashIconProps({ tokenSize: "sm" })} />}
        label="Drop"
        style={{
          borderColor: "var(--status-critical)",
          backgroundColor: "color-mix(in srgb, var(--status-critical) 7%, var(--surface))",
          color: "var(--status-critical)",
        }}
      />
    </div>
  );
}
