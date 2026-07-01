"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Input from "@/components/kash/ui/Input";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";

/** Fired by other chrome (e.g. the header search pill) to open the palette. */
export const OPEN_PALETTE_EVENT = "kash:open-palette";
/** Fired when the user runs the "Decide next task" command. DayPlanCanvas listens. */
export const DECIDE_EVENT = "kash:decide";

const ROW_FOCUS =
  "focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]";

type Command = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  }, []);

  const commands = useMemo<Command[]>(
    () => [
      { id: "go-today", label: "Go to Today", hint: "Plan", run: () => router.push("/today") },
      {
        id: "go-week",
        label: "Go to This Week",
        hint: "Plan",
        keywords: "upcoming later",
        run: () => router.push("/this-week"),
      },
      { id: "go-projects", label: "Go to Projects", run: () => router.push("/projects") },
      {
        id: "go-plan",
        label: "Go to Plan",
        hint: "Reflect & plan",
        keywords: "planning month quarter year horizon",
        run: () => router.push("/plan"),
      },
      {
        id: "go-abyss",
        label: "Go to Abyss",
        hint: "Reflect & plan",
        keywords: "backburner ideas later parked",
        run: () => router.push("/abyss"),
      },
      {
        id: "go-care",
        label: "Go to Care",
        hint: "Reflect & plan",
        keywords: "self-care wellbeing walks breathing reflection",
        run: () => router.push("/care"),
      },
      { id: "go-settings", label: "Go to Settings", run: () => router.push("/settings") },
      {
        id: "decide",
        label: "Decide next task",
        hint: "Focus",
        keywords: "random pick rdm",
        run: () => window.dispatchEvent(new CustomEvent(DECIDE_EVENT)),
      },
    ],
    [router]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  // Keep selection within bounds as the filtered list changes.
  useEffect(() => {
    setSelected((s) => (s >= filtered.length ? 0 : s));
  }, [filtered.length]);

  // Global ⌘K toggle + external open event.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      if (isEditableTarget(e.target) && !open) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSelected(0);
      // Focus after the overlay paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    close();
    cmd.run();
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center px-4 pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden onMouseDown={close} />
      <div className="relative z-sticky w-full max-w-lg overflow-hidden rounded-card border border-border bg-surface p-2 shadow-overlay">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(filtered.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(filtered[selected]);
            }
          }}
          placeholder="Search commands…"
          className="w-full"
          aria-label="Search commands"
        />
        <ul className="mt-2 max-h-72 overflow-y-auto" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted">No commands</li>
          ) : (
            filtered.map((cmd, i) => (
              <li key={cmd.id} role="option" aria-selected={i === selected}>
                <button
                  type="button"
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => run(cmd)}
                  className={`flex w-full items-center justify-between rounded-chip px-3 py-2 text-left text-sm transition ${ROW_FOCUS} ${
                    i === selected ? "bg-[var(--accent-soft)] text-ink" : "text-ink"
                  }`}
                >
                  <span>{cmd.label}</span>
                  {cmd.hint ? <span className="text-xs text-ink-muted">{cmd.hint}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
