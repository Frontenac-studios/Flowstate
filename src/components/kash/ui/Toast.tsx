"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import Button from "./Button";
import IconButton from "./IconButton";
import { kashIconProps } from "./icon";

import "./feedback-motion.css";

export type ToastVariant = "neutral" | "success" | "info" | "error";

export type ToastProps = {
  id: string;
  /** The title line (14/600). */
  message: ReactNode;
  /** Optional muted detail line (13). */
  detail?: ReactNode;
  variant?: ToastVariant;
  /** Stripe colour, e.g. the project's hue. Errors are always crimson. */
  stripe?: string;
  exiting?: boolean;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
};

/**
 * Spec v2 toast: white 14px card with a 3px stripe (the project's hue; crimson
 * on error), a 14/600 title, a muted detail line and a secondary pill action.
 */
export default function Toast({
  message,
  detail,
  variant = "neutral",
  stripe,
  exiting = false,
  action,
  onDismiss,
}: ToastProps) {
  const isError = variant === "error";
  const stripeColor = isError ? "var(--status-critical)" : (stripe ?? "var(--ink)");

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-[var(--space-3)] rounded-card border border-border bg-surface py-[var(--space-3)] pl-[var(--space-4)] pr-[var(--space-3)] shadow-overlay",
        exiting ? "toast-exit" : "toast-enter"
      )}
    >
      <span
        className="w-[var(--stripe-width)] shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: stripeColor }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[14px] font-semibold", isError ? "text-critical" : "text-ink")}>
          {message}
        </span>
        {detail ? <span className="text-meta text-ink-muted">{detail}</span> : null}
      </div>
      {action ? (
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 text-[14px]"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
      <IconButton type="button" aria-label="Dismiss" onClick={onDismiss}>
        <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
      </IconButton>
    </div>
  );
}
