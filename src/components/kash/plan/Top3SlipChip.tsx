"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import Button from "@/components/kash/ui/Button";
import "@/components/kash/ui/feedback-motion.css";
import IconButton from "@/components/kash/ui/IconButton";
import { kashIconProps } from "@/components/kash/ui/icon";
import { cn } from "@/lib/cn";
import { templateTop3SlipMessage } from "@/lib/nudges/template-top3-slip";
import type { SlippedTop3Task } from "@/lib/nudges/evaluate-top3-stall";

const EXIT_MS = 160;

type Props = {
  task: SlippedTop3Task;
  onBreakDown: () => void;
  onDrop: () => void;
  onKeep: () => void;
  className?: string;
};

/** Gentle amber slip chip on Top-3 (TD3 / T3). */
export function Top3SlipChip({ task, onBreakDown, onDrop, onKeep, className }: Props) {
  const [exiting, setExiting] = useState(false);

  const dismiss = (action: () => void) => {
    setExiting(true);
    window.setTimeout(action, EXIT_MS);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-row border border-l-[length:var(--stripe-width)] border-amber-200/80 border-l-amber-500 bg-amber-50/80 px-[var(--space-3)] py-[var(--space-2)] shadow-surface",
        exiting ? "nudge-fade-out" : "nudge-fade-in",
        className
      )}
      role="region"
      aria-label="Top 3 slip reminder"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          {...kashIconProps({ tokenSize: "md", className: "mt-0.5 shrink-0 text-amber-600" })}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-body text-ink">{templateTop3SlipMessage(task)}</p>
        <IconButton
          type="button"
          aria-label="Dismiss slip reminder"
          onClick={() => dismiss(onKeep)}
        >
          <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
        </IconButton>
      </div>
      <div className="flex flex-wrap gap-2 pl-7">
        <Button
          type="button"
          variant="ghost"
          className="text-body"
          onClick={() => dismiss(onBreakDown)}
        >
          Break down
        </Button>
        <Button type="button" variant="ghost" className="text-body" onClick={() => dismiss(onDrop)}>
          Drop
        </Button>
        <Button type="button" variant="ghost" className="text-body" onClick={() => dismiss(onKeep)}>
          Keep
        </Button>
      </div>
    </div>
  );
}
