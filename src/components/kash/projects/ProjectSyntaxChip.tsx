"use client";

import { useCallback, useId, useRef, useState } from "react";

import { OVERLAY_CARD } from "@/components/kash/ui/overlay-styles";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/cn";

const SYNTAX_HINT = [
  "One task per line: title ; due ; priority ; phase. Everything after the title is optional.",
  "Due takes today, tomorrow, a weekday, or 2026-09-24. Priority is !, !! or !!!.",
  "Phase takes a path like Reporting // Cutover. A + before a name creates it.",
  "Start a line with ;;; to create phases and no task.",
  "⌘↵ adds. Enter makes a new line.",
].join("\n\n");

type Props = {
  showOnFocus?: boolean;
  focused?: boolean;
};

/**
 * D25 — collapses the long composer syntax lesson into a chip + popover.
 * The full hint also surfaces when the composer textarea is focused.
 */
export default function ProjectSyntaxChip({ showOnFocus = false, focused = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hintId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [ref], close);

  const visible = open || (showOnFocus && focused);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={hintId}
        onClick={() => setOpen((value) => !value)}
        className="kash-focus-visible rounded-chip border border-subtle px-2 py-0.5 text-xs text-ink-muted transition hover:text-ink focus:outline-none"
      >
        syntax
      </button>
      {visible ? (
        <div
          id={hintId}
          role="tooltip"
          className={cn(
            OVERLAY_CARD,
            "absolute bottom-full left-0 z-overlay mb-1 w-80 whitespace-pre-line px-3 py-3 text-xs leading-relaxed text-ink-muted"
          )}
        >
          {SYNTAX_HINT}
        </div>
      ) : null}
    </div>
  );
}
