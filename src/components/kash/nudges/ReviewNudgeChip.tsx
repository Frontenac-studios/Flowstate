"use client";

import { Calendar, Moon, X } from "lucide-react";
import { useState } from "react";

import Button from "@/components/kash/ui/Button";
import "@/components/kash/ui/feedback-motion.css";
import IconButton from "@/components/kash/ui/IconButton";
import { kashIconProps } from "@/components/kash/ui/icon";
import { cn } from "@/lib/cn";

const EXIT_MS = 160;

export type ReviewNudgeKind = "eod" | "eow";

type Props = {
  kind: ReviewNudgeKind;
  message: string;
  onReview: () => void;
  onDismiss: () => void;
  className?: string;
};

/** Soft dismissible EoD/EoW chip (DT-18). Parent controls visibility — never auto-opens. */
export default function ReviewNudgeChip({ kind, message, onReview, onDismiss, className }: Props) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    window.setTimeout(() => {
      onDismiss();
    }, EXIT_MS);
  };

  const KindIcon = kind === "eod" ? Moon : Calendar;
  const regionLabel = kind === "eod" ? "End of day review nudge" : "End of week review nudge";

  return (
    <div
      className={cn(
        "flex items-center gap-[var(--space-3)] rounded-row border border-l-[length:var(--stripe-width)] border-border border-l-ink bg-surface px-[var(--space-3)] py-[var(--space-2)]",
        exiting ? "nudge-fade-out" : "nudge-fade-in",
        className
      )}
      role="region"
      aria-label={regionLabel}
    >
      <KindIcon
        {...kashIconProps({ tokenSize: "md", className: "shrink-0 text-ink-muted" })}
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-body text-ink">{message}</p>
      <Button type="button" variant="ghost" className="shrink-0 text-body" onClick={onReview}>
        Review
      </Button>
      <IconButton type="button" aria-label="Dismiss nudge" onClick={handleDismiss}>
        <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
      </IconButton>
    </div>
  );
}
