"use client";

import { useEffect, useRef } from "react";

type Shortcut = {
  keys: string;
  description: string;
};

const SHORTCUTS: Shortcut[] = [
  { keys: "/", description: "Focus the task composer" },
  {
    keys: "Tab",
    description:
      "Accept composer suggestion when available; otherwise jump into the triage strip (when present)",
  },
  { keys: "1 – 4", description: "Triage: Today, Tomorrow, Later, Drop" },
  { keys: "⌘1 – ⌘3", description: "Pin selected Today row to Top 3 slot" },
  { keys: "⌘D", description: "Random weighted pick (RDM) → Focus mode" },
  { keys: "⌘Return", description: "Mark current focus task done" },
  { keys: "Esc", description: "Exit Focus mode (or leave triage keyboard mode)" },
  { keys: "⌘K", description: "Toggle Claude chat side rail" },
  { keys: "⌘Z", description: "Undo complete, delete, or triage drop (this session)" },
  { keys: "⌘Enter", description: "Submit all composer lines" },
  { keys: "?", description: "Open this shortcuts reference" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        tabIndex={-1}
        className="glass-panel-strong relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto p-6"
      >
        <h2 id="shortcuts-title" className="text-lg font-semibold text-kash-ink">
          Keyboard shortcuts
        </h2>
        <p className="mt-1 text-sm text-kash-ink-muted">On the plan canvas only.</p>
        <dl className="mt-4 space-y-3">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-start justify-between gap-4">
              <dt className="shrink-0 font-mono text-sm text-kash-ink">{s.keys}</dt>
              <dd className="text-right text-sm text-kash-ink-muted">{s.description}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="glass-btn-ghost mt-6 text-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
