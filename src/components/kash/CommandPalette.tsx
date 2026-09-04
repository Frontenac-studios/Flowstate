"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Input from "@/components/kash/ui/Input";
import { KeyCap } from "@/components/kash/ui/KeyCap";
import { SearchResultRow } from "@/components/kash/search/SearchResultRow";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { useDebounced } from "@/lib/search/use-debounced";
import { useTRPC } from "@/trpc/client";
import type { SearchResult } from "@/trpc/routers/search";

import {
  DECIDE_EVENT,
  OPEN_ABYSS_CAPTURE_EVENT,
  OPEN_NEW_PROJECT_EVENT,
  OPEN_PALETTE_EVENT,
} from "./chrome-events";

export { DECIDE_EVENT, OPEN_PALETTE_EVENT } from "./chrome-events";

const ROW_FOCUS =
  "focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]";

type Command = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

/**
 * The palette holds two kinds of row (W17f). Commands are a fixed list the user
 * learns; results are whatever they own. They share one keyboard loop, so they
 * share one type — and commands stay pinned above results, because a command is
 * a thing you meant to do and a result is a thing you went looking for.
 */
type Row = { kind: "command"; command: Command } | { kind: "result"; result: SearchResult };

/** Below this, a query matches so much of the database that the list is noise. */
const MIN_QUERY_LENGTH = 2;

const RESULT_LIMIT = 8;

export function CommandPalette() {
  const router = useRouter();
  const trpc = useTRPC();
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
        id: "new-project",
        label: "New project",
        hint: "n",
        keywords: "create add project client engagement",
        run: () => window.dispatchEvent(new CustomEvent(OPEN_NEW_PROJECT_EVENT)),
      },
      {
        id: "go-plan",
        label: "Go to Plan",
        hint: "Reflect & plan",
        keywords: "planning month quarter year horizon",
        run: () => router.push("/plan"),
      },
      {
        id: "go-backlog",
        label: "Go to Backlog",
        hint: "Reflect & plan",
        keywords: "backburner ideas later parked backlog",
        run: () => router.push("/backlog"),
      },
      { id: "go-settings", label: "Go to Settings", run: () => router.push("/settings") },
      {
        id: "decide",
        label: "Decide next task",
        hint: "Focus",
        keywords: "random pick rdm",
        run: () => window.dispatchEvent(new CustomEvent(DECIDE_EVENT)),
      },
      {
        id: "quick-capture",
        label: "Quick-capture to Backlog",
        hint: "⌘⇧A",
        keywords: "abyss capture park idea note backlog deep",
        run: () => window.dispatchEvent(new CustomEvent(OPEN_ABYSS_CAPTURE_EVENT)),
      },
    ],
    [router]
  );

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  const searchTerm = useDebounced(query.trim());
  const { data: results = [] } = useQuery({
    ...trpc.search.query.queryOptions({ q: searchTerm, limit: RESULT_LIMIT }),
    enabled: open && searchTerm.length >= MIN_QUERY_LENGTH,
  });

  const rows = useMemo<Row[]>(
    () => [
      ...filteredCommands.map((command) => ({ kind: "command" as const, command })),
      ...results.map((result) => ({ kind: "result" as const, result })),
    ],
    [filteredCommands, results]
  );

  // Keep selection within bounds as the list changes.
  useEffect(() => {
    setSelected((s) => (s >= rows.length ? 0 : s));
  }, [rows.length]);

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

  const run = (row: Row | undefined) => {
    if (!row) return;
    close();
    if (row.kind === "command") {
      row.command.run();
      return;
    }
    router.push(row.result.href);
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-modal flex items-start justify-center px-4 pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: "var(--backdrop)" }}
        aria-hidden
        onMouseDown={close}
      />
      <div className="modal-panel relative z-sticky w-full max-w-lg overflow-hidden rounded-card border border-border bg-surface p-2 shadow-overlay">
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
              setSelected((s) => Math.min(rows.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(rows[selected]);
            }
          }}
          placeholder="Search tasks, projects, clients, or a command…"
          className="w-full"
          aria-label="Search tasks, projects, clients, or a command"
        />
        <ul className="mt-2 max-h-72 overflow-y-auto" role="listbox">
          {rows.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted">
              {query.trim().length >= MIN_QUERY_LENGTH ? "Nothing by that name" : "No commands"}
            </li>
          ) : (
            rows.map((row, i) =>
              row.kind === "command" ? (
                <li key={row.command.id} role="option" aria-selected={i === selected}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => run(row)}
                    className={`flex w-full items-center justify-between rounded-chip px-3 py-2 text-left text-sm transition ${ROW_FOCUS} ${
                      i === selected ? "bg-[var(--accent-soft)] text-ink" : "text-ink"
                    }`}
                  >
                    <span>{row.command.label}</span>
                    {row.command.hint ? <KeyCap>{row.command.hint}</KeyCap> : null}
                  </button>
                </li>
              ) : (
                <li
                  key={`${row.result.kind}-${row.result.id}`}
                  onMouseEnter={() => setSelected(i)}
                  className="rounded-chip"
                >
                  <SearchResultRow
                    result={row.result}
                    selected={i === selected}
                    onSelect={() => run(row)}
                  />
                </li>
              )
            )
          )}
        </ul>
      </div>
    </div>
  );
}
