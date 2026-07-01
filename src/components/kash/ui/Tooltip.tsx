"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

const SHOW_DELAY_MS = 400;

type Props = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Tooltip({ content, children, className }: Props) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const scheduleShow = useCallback(() => {
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      });
      setOpen(true);
    }, SHOW_DELAY_MS);
  }, [clearShowTimer]);

  const hide = useCallback(() => {
    clearShowTimer();
    setOpen(false);
  }, [clearShowTimer]);

  const describedBy = open ? tooltipId : undefined;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocusCapture={scheduleShow}
        onBlurCapture={hide}
        aria-describedby={describedBy}
      >
        {children}
      </span>
      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className={cn(
                "fixed z-overlay max-w-xs -translate-x-1/2 rounded-control bg-[var(--tooltip-bg)] px-[var(--space-3)] py-[var(--space-2)] text-caption text-[var(--tooltip-ink)] transition-opacity duration-micro motion-reduce:transition-none",
                className
              )}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
