"use client";

import { Footprints, ListOrdered, Sparkles, X } from "lucide-react";
import { useState, type CSSProperties } from "react";

import Button from "@/components/kash/ui/Button";
import "@/components/kash/ui/feedback-motion.css";
import IconButton from "@/components/kash/ui/IconButton";
import { kashIconProps } from "@/components/kash/ui/icon";
import { cn } from "@/lib/cn";
import type { EssentialNudgeKind } from "@/lib/nudges/essential-nudge-types";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";

const EXIT_MS = 160;

type Props = {
  kind: EssentialNudgeKind;
  message: string;
  actionLabel?: string;
  categoryTint?: ProjectCategory;
  onAction?: () => void;
  onDismiss: () => void;
  className?: string;
};

const KIND_META: Record<
  EssentialNudgeKind,
  { icon: typeof ListOrdered; regionLabel: string; defaultAction?: string }
> = {
  top3_stall: {
    icon: ListOrdered,
    regionLabel: "Top 3 nudge",
    defaultAction: "Decide",
  },
  self_care_walk: {
    icon: Footprints,
    regionLabel: "Self-care nudge",
    defaultAction: "Care",
  },
  monthly_review: {
    icon: Sparkles,
    regionLabel: "Monthly review nudge",
    defaultAction: "Stargaze",
  },
  balance_lopsided: {
    icon: Sparkles,
    regionLabel: "Balance nudge",
    defaultAction: "Add it",
  },
  goal_step: {
    icon: ListOrdered,
    regionLabel: "Goal step nudge",
    defaultAction: "Step",
  },
  top3_slip: {
    icon: ListOrdered,
    regionLabel: "Top 3 slip nudge",
    defaultAction: "Top 3",
  },
  evidence_surface: {
    icon: Sparkles,
    regionLabel: "Evidence nudge",
    defaultAction: "View",
  },
};

/** Minimal dismissible essential nudge chip (§8A). Parent controls visibility. */
export default function EssentialNudgeChip({
  kind,
  message,
  actionLabel,
  categoryTint,
  onAction,
  onDismiss,
  className,
}: Props) {
  const [exiting, setExiting] = useState(false);
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;
  const label = actionLabel ?? meta.defaultAction;
  const tintStyle = categoryTint
    ? ({ borderLeftColor: categorySolidVar(categoryTint) } as CSSProperties)
    : undefined;

  const handleDismiss = () => {
    setExiting(true);
    window.setTimeout(() => {
      onDismiss();
    }, EXIT_MS);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-[var(--space-3)] rounded-row border border-l-[length:var(--stripe-width)] border-border border-l-ink bg-surface px-[var(--space-3)] py-[var(--space-2)] shadow-sm",
        exiting ? "nudge-fade-out" : "nudge-fade-in",
        className
      )}
      style={tintStyle}
      role="region"
      aria-label={meta.regionLabel}
    >
      <KindIcon
        {...kashIconProps({ tokenSize: "md", className: "shrink-0 text-ink-muted" })}
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-body text-ink">{message}</p>
      {label && onAction ? (
        <Button type="button" variant="ghost" className="shrink-0 text-body" onClick={onAction}>
          {label}
        </Button>
      ) : null}
      <IconButton type="button" aria-label="Dismiss nudge" onClick={handleDismiss}>
        <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
      </IconButton>
    </div>
  );
}
