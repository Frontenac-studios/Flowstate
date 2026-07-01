"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { Lightbulb, Moon, SquareCheck, withKashIcon } from "@/components/kash/ui/icon";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

import { OPEN_ABYSS_CAPTURE_EVENT } from "../chrome-events";
import { useAbyssEmbedding } from "./useAbyssEmbedding";

const IdeaIcon = withKashIcon(Lightbulb);
const TaskIcon = withKashIcon(SquareCheck);
const MoonIcon = withKashIcon(Moon);

const INPUT_FOCUS = "focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]";
const BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

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
      className={`flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-caption transition ${BTN_FOCUS} ${
        type === value ? "bg-accent-soft text-ink" : "text-ink-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center px-4 pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Park in the Abyss"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden onMouseDown={close} />
      <div className="relative z-base w-full max-w-lg overflow-hidden rounded-card border border-subtle bg-surface p-3 shadow-overlay">
        <div className="mb-2 flex items-center gap-2 px-1 text-ink-muted">
          <MoonIcon size={14} />
          <span className="text-caption font-medium">Park in the Abyss</span>
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
          className={`w-full rounded-control border border-border bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint ${INPUT_FOCUS}`}
          aria-label="Item title"
        />

        {expanded ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex w-fit items-center gap-1 rounded-chip bg-accent-soft p-0.5">
              <TypeToggle value="idea" label="Idea" icon={<IdeaIcon size={14} />} />
              <TypeToggle value="task" label="Task" icon={<TaskIcon size={14} />} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={`rounded-chip px-2 py-0.5 text-caption transition ${BTN_FOCUS} ${
                  category === null ? "bg-accent-soft text-ink" : "text-ink-muted"
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
                  className={`flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-caption transition ${BTN_FOCUS} ${
                    category === cat ? "bg-accent-soft text-ink" : "text-ink-muted"
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
              className={`w-full resize-none rounded-control border border-border bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint ${INPUT_FOCUS}`}
              aria-label="Note"
            />
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className={`text-caption text-ink-muted transition hover:text-ink ${BTN_FOCUS}`}
          >
            {expanded ? "Less" : "More"}
          </button>
          <Button type="button" onClick={submit} disabled={!canSubmit} className="text-caption">
            Park
          </Button>
        </div>
      </div>
    </div>
  );
}
