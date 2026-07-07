"use client";

import { useEffect, useId, useRef, useState } from "react";

const SYNTAX_HINT =
  "Parent//+ Child nests a sub-directory · ;;; + Phase creates directories only · one task per line · add ⌘↵";

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

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = open || (showOnFocus && focused);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={hintId}
        onClick={() => setOpen((value) => !value)}
        className="rounded-chip border border-subtle px-2 py-0.5 text-xs text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
      >
        syntax
      </button>
      {visible ? (
        <div
          id={hintId}
          role="tooltip"
          className="absolute bottom-full left-0 z-overlay mb-1 w-72 rounded-card border border-subtle bg-surface p-3 text-xs leading-relaxed text-ink-muted shadow-overlay"
        >
          {SYNTAX_HINT}
        </div>
      ) : null}
    </div>
  );
}
