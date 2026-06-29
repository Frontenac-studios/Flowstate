"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

import { IdeaIcon, MoonIcon, TaskIcon } from "./icons";
import { useAbyssEmbedding } from "./useAbyssEmbedding";

/** Fired by other chrome to open quick-capture (mirrors OPEN_PALETTE_EVENT). */
export const OPEN_ABYSS_CAPTURE_EVENT = "kash:open-abyss-capture";

type AbyssType = "idea" | "task";

/**
 * Global ⌘⇧A quick-capture overlay — park a backburner idea or task into the Abyss
 * from anywhere (§8A). Quick mode (just a title) by default; "More" reveals type,
 * category, and a note. Mounted once in AppShell.
 */
export default function AbyssQuickCapture() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AbyssType>("idea");
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setTitle("");
    setNote("");
    setCategory(null);
    setType("idea");
    setExpanded(false);
  }, []);

  const embedAndStore = useAbyssEmbedding();

  const createMutation = useMutation(
    trpc.abyss.create.mutationOptions({
      onSuccess: (row, variables) => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
        void embedAndStore(row.id, variables.title, true);
        close();
      },
    })
  );

  // Global ⌘⇧A toggle + external open event.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.key.toLowerCase() !== "a") return;
      if (isEditableTarget(e.target) && !open) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_ABYSS_CAPTURE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_ABYSS_CAPTURE_EVENT, onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !createMutation.isPending;

  const submit = () => {
    if (!canSubmit) return;
    createMutation.mutate({ title: trimmed, type, category, note: note.trim() || null });
  };

  const TypeToggle = ({
    value,
    label,
    icon,
  }: {
    value: AbyssType;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => setType(value)}
      aria-pressed={type === value}
      className={`flex items-center gap-1.5 rounded-[var(--kash-radius-chip)] px-2.5 py-1 text-sm transition ${
        type === value ? "bg-[var(--kash-accent-soft)] text-kash-ink" : "text-kash-ink-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Park in the Abyss"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden onMouseDown={close} />
      <div className="glass-panel-strong relative z-10 w-full max-w-lg overflow-hidden p-3">
        <div className="mb-2 flex items-center gap-2 px-1 text-kash-ink-muted">
          <MoonIcon size={15} />
          <span className="text-xs font-medium">Park in the Abyss</span>
        </div>

        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="A backburner idea or deferred task…"
          maxLength={200}
          className="glass-input w-full"
          aria-label="Item title"
        />

        {expanded ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex w-fit items-center gap-1 rounded-[var(--kash-radius-chip)] bg-[var(--kash-accent-soft)] p-0.5">
              <TypeToggle value="idea" label="Idea" icon={<IdeaIcon size={14} />} />
              <TypeToggle value="task" label="Task" icon={<TaskIcon size={14} />} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={`rounded-[var(--kash-radius-chip)] px-2 py-0.5 text-xs transition ${
                  category === null
                    ? "bg-[var(--kash-accent-soft)] text-kash-ink"
                    : "text-kash-ink-muted"
                }`}
              >
                No category
              </button>
              {PROJECT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={`flex items-center gap-1.5 rounded-[var(--kash-radius-chip)] px-2 py-0.5 text-xs transition ${
                    category === cat
                      ? "bg-[var(--kash-accent-soft)] text-kash-ink"
                      : "text-kash-ink-muted"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: categorySolidVar(cat) }}
                    aria-hidden
                  />
                  {categoryLabel(cat)}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              maxLength={2000}
              rows={2}
              className="glass-input w-full resize-none"
              aria-label="Note"
            />
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className="text-xs text-kash-ink-muted transition hover:text-kash-ink"
          >
            {expanded ? "Less" : "More"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="glass-btn-primary disabled:opacity-40"
          >
            Park
          </button>
        </div>
      </div>
    </div>
  );
}
