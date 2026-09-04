"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  hideCapturePanel,
  resizeCapturePanel,
  subscribeCaptureOpened,
} from "@/lib/desktop/capture-bridge";
import { getParseChips } from "@/components/kash/plan/ParsePreviewChips";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { parseQuickInputLines, type ParseResult } from "@/lib/parser/parse-quick-input";
import type { ProjectRef } from "@/lib/parser/fuzzy-project";
import { useTRPC } from "@/trpc/client";

/** Where a captured line lands. Remembered between opens, never asked twice. */
type CaptureTarget = "backlog" | "today";

const TARGET_KEY = "kash:capture-target";

function readTarget(): CaptureTarget {
  if (typeof window === "undefined") return "backlog";
  try {
    return window.localStorage.getItem(TARGET_KEY) === "today" ? "today" : "backlog";
  } catch {
    return "backlog";
  }
}

function writeTarget(target: CaptureTarget): void {
  try {
    window.localStorage.setItem(TARGET_KEY, target);
  } catch {
    // Private window, or storage disabled. The default stands for this session.
  }
}

/** Properties the Abyss has no room for, so the panel can say so rather than drop them silently. */
function droppedForBacklog(parse: ParseResult | null): string[] {
  if (!parse) return [];
  const dropped: string[] = [];
  if (parse.projectSlug) dropped.push("project");
  if (parse.scheduledDate || parse.bucketOverride) dropped.push("date");
  if (parse.priority > 0) dropped.push("priority");
  return dropped;
}

/**
 * The global capture panel (W17). Lives in its own borderless window that ⌘⇧K
 * shows over whatever app you are in; Flowstate itself never comes forward.
 *
 * Three rules it exists to honour:
 *   - ⏎ saves and dismisses. The panel is a doorway, not a place.
 *   - ⇧⏎ saves and stays, because a phone call produces four thoughts, not one.
 *   - The line is parsed with the same composer syntax as everywhere else, so
 *     nothing new has to be learned to use it.
 */
export function CapturePanel() {
  const trpc = useTRPC();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState("");
  const [target, setTarget] = useState<CaptureTarget>("backlog");
  const [captured, setCaptured] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTarget(readTarget()), []);

  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());
  const projectRefs = useMemo<ProjectRef[]>(
    () => projects.map((p) => ({ slug: p.slug, name: p.name })),
    [projects]
  );

  const parse = useMemo<ParseResult | null>(() => {
    if (!value.trim()) return null;
    return parseQuickInputLines(value, { projects: projectRefs })[0]?.parse ?? null;
  }, [value, projectRefs]);

  const projectId = useMemo(() => {
    if (!parse?.projectSlug) return null;
    const key = parse.projectSlug.toLowerCase();
    return projects.find((p) => p.slug.toLowerCase() === key)?.id ?? null;
  }, [parse, projects]);

  const abyssCreate = useMutation(trpc.abyss.create.mutationOptions());
  const taskCreate = useMutation(trpc.tasks.create.mutationOptions());
  const saving = abyssCreate.isPending || taskCreate.isPending;

  const reset = useCallback(() => {
    setValue("");
    setError(null);
    setCaptured([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const dismiss = useCallback(() => {
    reset();
    hideCapturePanel();
  }, [reset]);

  // The window is shown and hidden, never remounted, so the shell tells us when
  // it comes back up and the panel clears itself.
  useEffect(() => subscribeCaptureOpened(reset), [reset]);

  // Keep the window exactly as tall as its content: one line at rest, taller
  // once a chip row or a captured list appears.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const report = () => resizeCapturePanel(node.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const chooseTarget = useCallback((next: CaptureTarget) => {
    setTarget(next);
    writeTarget(next);
    inputRef.current?.focus();
  }, []);

  const save = useCallback(
    async (keepOpen: boolean) => {
      const trimmed = value.trim();
      if (!trimmed || saving) return;

      const title = parse?.title.trim() || trimmed;
      setError(null);

      try {
        if (target === "backlog") {
          await abyssCreate.mutateAsync({
            title,
            type: "task",
            category: parse?.category ?? null,
            source: "capture",
            tags: parse?.tags,
          });
        } else {
          await taskCreate.mutateAsync({
            title,
            scheduledDate: parse?.scheduledDate ?? null,
            bucketOverride: parse?.bucketOverride ?? null,
            projectId,
            priority: parse?.priority ?? 0,
            category: parse?.category ?? undefined,
            tags: parse?.tags,
            rrule: parse?.rrule ?? undefined,
          });
        }
      } catch {
        setError("Couldn't save that. It's still in the field, try again.");
        return;
      }

      if (keepOpen) {
        setCaptured((prev) => [...prev, title]);
        setValue("");
        inputRef.current?.focus();
        return;
      }

      dismiss();
    },
    [value, saving, parse, target, projectId, abyssCreate, taskCreate, dismiss]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void save(event.shiftKey);
    }
  };

  // Esc anywhere in the panel dismisses, including from the toggle buttons.
  useEffect(() => {
    const onWindowKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isEditableTarget(event.target)) return;
      event.preventDefault();
      dismiss();
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, [dismiss]);

  const chips = parse ? getParseChips(parse) : [];
  const dropped = target === "backlog" ? droppedForBacklog(parse) : [];

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-card border border-border bg-surface shadow-lg"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={target === "backlog" ? "Capture to Backlog…" : "Capture onto Today…"}
          aria-label="Capture a task"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
        />
        <div className="flex shrink-0 items-center gap-0.5 rounded-pill bg-surface-2 p-0.5">
          {(["backlog", "today"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => chooseTarget(option)}
              aria-pressed={target === option}
              className={`rounded-pill px-2.5 py-0.5 text-xs capitalize transition-colors ${
                target === option ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {chips.length > 0 || dropped.length > 0 || captured.length > 0 || error ? (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {dropped.length > 0 ? (
            <p className="text-xs text-ink-faint">
              Backlog items don&apos;t carry a {dropped.join(" or ")}. Switch to Today to keep{" "}
              {dropped.length > 1 ? "them" : "it"}.
            </p>
          ) : null}

          {captured.map((title, index) => (
            <p key={`${title}-${index}`} className="truncate text-xs text-ink-muted">
              ✓ {title}
            </p>
          ))}

          {error ? <p className="text-xs text-critical">{error}</p> : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-border bg-surface-2 px-3 py-1.5 text-[11px] text-ink-faint">
        <span>⏎ save</span>
        <span>⇧⏎ save and keep going</span>
        <span>esc close</span>
      </div>
    </div>
  );
}
