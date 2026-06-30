"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import Textarea from "@/components/kash/ui/Textarea";
import { CADENCE_OPTIONS, THEME_LABELS, THEME_ORDER } from "@/lib/care/labels";
import type { CareCadence, CareTheme } from "@/lib/care/types";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/client";

type CareActivity = RouterOutputs["care"]["listActivities"][number];

type Props = {
  /** Editing an existing practice, or `null`/absent to create a new custom one. */
  activity?: CareActivity | null;
  onClose: () => void;
};

export default function CreatePracticeDialog({ activity, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = Boolean(activity);

  const [title, setTitle] = useState(activity?.title ?? "");
  const [theme, setTheme] = useState<CareTheme | null>(activity?.theme ?? null);
  const [cadence, setCadence] = useState<CareCadence | "">(activity?.cadence ?? "");
  const [note, setNote] = useState(activity?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.care.listActivities.queryKey() });
  };

  const createMutation = useMutation(
    trpc.care.createCustom.mutationOptions({
      onSuccess: () => {
        invalidate();
        onClose();
      },
      onError: () => setError("Couldn't save your practice — please try again."),
    })
  );

  const updateMutation = useMutation(
    trpc.care.updateActivity.mutationOptions({
      onSuccess: () => {
        invalidate();
        onClose();
      },
      onError: () => setError("Couldn't save your change — please try again."),
    })
  );

  const pending = createMutation.isPending || updateMutation.isPending;
  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && theme !== null && !pending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || theme === null) return;
    setError(null);
    const trimmedNote = note.trim();

    if (activity) {
      updateMutation.mutate({
        id: activity.id,
        title: trimmedTitle,
        theme,
        cadence: cadence === "" ? null : cadence,
        note: trimmedNote === "" ? null : trimmedNote,
      });
    } else {
      createMutation.mutate({
        title: trimmedTitle,
        theme,
        cadence: cadence === "" ? undefined : cadence,
        note: trimmedNote === "" ? undefined : trimmedNote,
      });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-dialog-title"
        className="relative z-10 w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-overlay"
      >
        <h2 id="practice-dialog-title" className="text-lg font-semibold text-ink">
          {isEdit ? "Edit practice" : "New practice"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="practice-title" className="text-sm font-medium text-ink">
              Title
            </label>
            <Input
              ref={titleRef}
              id="practice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Step outside for fresh air"
              maxLength={200}
            />
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium text-ink">
              Theme <span className="text-ink-muted">(required)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {THEME_ORDER.map((value) => {
                const selected = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={selected}
                    className={`rounded-chip border px-3 py-1 text-sm font-medium transition ${
                      selected
                        ? "border-ink bg-surface-2 text-ink"
                        : "border-subtle text-ink-muted hover:text-ink"
                    }`}
                  >
                    {THEME_LABELS[value]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="practice-cadence" className="text-sm font-medium text-ink">
              Rhythm
            </label>
            <Select
              id="practice-cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as CareCadence | "")}
            >
              {CADENCE_OPTIONS.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="practice-note" className="text-sm font-medium text-ink">
              Note <span className="text-ink-muted">(optional)</span>
            </label>
            <Textarea
              id="practice-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A reminder to yourself…"
              maxLength={2000}
              className="min-h-16 resize-y"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create practice"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
