"use client";

import { CheckCircle2, Circle, CircleAlert, Info, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import Button from "./Button";
import IconButton from "./IconButton";
import { kashIconProps } from "./icon";

import "./feedback-motion.css";

export type ToastVariant = "neutral" | "success" | "info" | "error";

export type ToastProps = {
  id: string;
  message: ReactNode;
  variant?: ToastVariant;
  exiting?: boolean;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
};

const VARIANT_ICONS = {
  neutral: Circle,
  success: CheckCircle2,
  info: Info,
  error: CircleAlert,
} as const;

export default function Toast({
  message,
  variant = "neutral",
  exiting = false,
  action,
  onDismiss,
}: ToastProps) {
  const Icon = VARIANT_ICONS[variant];
  const iconClassName = variant === "error" ? "shrink-0 text-critical" : "shrink-0 text-ink";

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-[var(--space-3)] rounded-card border border-border bg-surface px-[var(--space-4)] py-[var(--space-3)] shadow-overlay",
        exiting ? "toast-exit" : "toast-enter"
      )}
    >
      <Icon {...kashIconProps({ tokenSize: "md", className: iconClassName })} aria-hidden />
      <span className="min-w-0 flex-1 text-body text-ink">{message}</span>
      {action ? (
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 text-body"
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
