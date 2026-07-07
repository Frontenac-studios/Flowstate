"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import { useProjectMutations } from "./useProjectMutations";
import type { ProjectDetail, ProjectMilestone, ProjectPhase } from "./types";

type Props = {
  open: boolean;
  project: ProjectDetail;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  onClose: () => void;
};

type PhaseDraft = {
  key: string;
  id: string | null;
  name: string;
  startDate: string;
  endDate: string;
  tasks: string;
  original: { name: string; startDate: string; endDate: string } | null;
};

type MilestoneDraft = {
  key: string;
  id: string | null;
  title: string;
  targetDate: string;
  original: { title: string; targetDate: string } | null;
};

const STEPS = ["Basics", "Phases", "Dates", "Milestones", "Tasks"] as const;

const DATE_INPUT_CLASS =
  "rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]";

function draftKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Math.random().toString(36).slice(2)}`;
}

export default function ProjectSetupWizard({ open, project, phases, milestones, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const m = useProjectMutations(project.id);

  const updateProject = useMutation(trpc.projects.update.mutationOptions());
  const createMilestone = useMutation(trpc.projectMilestones.create.mutationOptions());
  const updateMilestone = useMutation(trpc.projectMilestones.update.mutationOptions());

  const [step, setStep] = useState(0);
  const [name, setName] = useState(project.name);
  const [category, setCategory] = useState<ProjectCategory>(project.category);
  const [phaseDrafts, setPhaseDrafts] = useState<PhaseDraft[]>([]);
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (Re)seed the editable draft from live data each time the wizard opens. Only
  // root-level phases are managed here; deeper nesting stays on the board.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setName(project.name);
    setCategory(project.category);
    setPhaseDrafts(
      phases
        .filter((p) => p.parentPhaseId === null)
        .map((p) => ({
          key: p.id,
          id: p.id,
          name: p.name,
          startDate: p.startDate ?? "",
          endDate: p.endDate ?? "",
          tasks: "",
          original: { name: p.name, startDate: p.startDate ?? "", endDate: p.endDate ?? "" },
        }))
    );
    setMilestoneDrafts(
      milestones.map((mi) => ({
        key: mi.id,
        id: mi.id,
        title: mi.title,
        targetDate: mi.targetDate ?? "",
        original: { title: mi.title, targetDate: mi.targetDate ?? "" },
      }))
    );
    // Only re-seed on open; edits within a session shouldn't be clobbered by refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project.id]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, saving, onClose]);

  const namedPhases = useMemo(
    () => phaseDrafts.filter((p) => p.name.trim().length > 0),
    [phaseDrafts]
  );

  if (!open) return null;

  const isEditing = phases.length > 0 || milestones.length > 0;

  const updatePhaseDraft = (key: string, patch: Partial<PhaseDraft>) =>
    setPhaseDrafts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const addPhase = () =>
    setPhaseDrafts((prev) => [
      ...prev,
      {
        key: draftKey(),
        id: null,
        name: "",
        startDate: "",
        endDate: "",
        tasks: "",
        original: null,
      },
    ]);

  const removePhase = (key: string) => setPhaseDrafts((prev) => prev.filter((p) => p.key !== key));

  const updateMilestoneDraft = (key: string, patch: Partial<MilestoneDraft>) =>
    setMilestoneDrafts((prev) => prev.map((mi) => (mi.key === key ? { ...mi, ...patch } : mi)));

  const addMilestone = () =>
    setMilestoneDrafts((prev) => [
      ...prev,
      { key: draftKey(), id: null, title: "", targetDate: "", original: null },
    ]);

  const removeMilestone = (key: string) =>
    setMilestoneDrafts((prev) => prev.filter((mi) => mi.key !== key));

  async function commit() {
    setSaving(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      if (
        trimmedName.length > 0 &&
        (trimmedName !== project.name || category !== project.category)
      ) {
        await updateProject.mutateAsync({ id: project.id, name: trimmedName, category });
      }

      for (const p of phaseDrafts) {
        const phaseName = p.name.trim();
        if (!phaseName) continue;

        let id = p.id;
        if (!id) {
          const row = await m.createPhase.mutateAsync({ projectId: project.id, name: phaseName });
          id = row.id;
        } else if (p.original && phaseName !== p.original.name) {
          await m.updatePhase.mutateAsync({ id, name: phaseName });
        }

        const start = p.startDate || null;
        const end = p.endDate || null;
        const datesChanged =
          !p.original ||
          start !== (p.original.startDate || null) ||
          end !== (p.original.endDate || null);
        if (datesChanged && (start !== null || end !== null || p.original)) {
          await m.updatePhase.mutateAsync({ id, startDate: start, endDate: end });
        }

        for (const line of p.tasks
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)) {
          await m.createTask.mutateAsync({ projectId: project.id, phaseId: id, title: line });
        }
      }

      for (const mi of milestoneDrafts) {
        const title = mi.title.trim();
        if (!title) continue;
        const date = mi.targetDate || null;
        if (!mi.id) {
          await createMilestone.mutateAsync({ projectId: project.id, title, targetDate: date });
        } else if (
          mi.original &&
          (title !== mi.original.title || date !== (mi.original.targetDate || null))
        ) {
          await updateMilestone.mutateAsync({ id: mi.id, title, targetDate: date });
        }
      }

      m.invalidate();
      await queryClient.invalidateQueries({
        queryKey: trpc.projectMilestones.listByProject.queryKey({ projectId: project.id }),
      });
      await queryClient.invalidateQueries({
        queryKey: trpc.projects.getById.queryKey({ id: project.id }),
      });
      onClose();
    } catch (err) {
      console.error("[ProjectSetupWizard] commit failed", err);
      setError(
        err instanceof Error && /on or after/.test(err.message)
          ? "A phase end date must be on or after its start date."
          : "Couldn't save your setup. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        className="relative z-base flex max-h-[85vh] w-full max-w-2xl flex-col rounded-card border border-border bg-surface shadow-overlay"
      >
        <div className="flex items-start justify-between gap-3 border-b border-subtle p-6 pb-4">
          <div>
            <h2 id="wizard-title" className="text-lg font-semibold text-ink">
              {isEditing ? "Edit project setup" : "Set up your project"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <ol className="hidden items-center gap-1.5 pt-1 sm:flex" aria-hidden>
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`h-1.5 w-6 rounded-full transition ${
                  i <= step ? "bg-ink" : "bg-surface-2"
                }`}
              />
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {step === 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wizard-name" className="text-sm font-medium text-ink">
                  Project name
                </label>
                <Input
                  id="wizard-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  autoFocus
                />
              </div>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1 text-sm font-medium text-ink">Category</legend>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_CATEGORIES.map((value) => {
                    const selected = category === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategory(value)}
                        aria-pressed={selected}
                        className={`flex items-center gap-1.5 rounded-chip border px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
                          selected
                            ? "border-transparent"
                            : "border-subtle text-ink-muted hover:text-ink"
                        }`}
                        style={
                          selected
                            ? {
                                backgroundColor: categoryFillVar(value),
                                color: categoryTextVar(value),
                              }
                            : undefined
                        }
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: categorySolidVar(value),
                            boxShadow: "0 0 0 1px var(--mark-ring)",
                          }}
                          aria-hidden
                        />
                        {categorySeedLabel(value)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                Break the project into phases. You can add more later on the board.
              </p>
              <ul className="flex flex-col gap-2">
                {phaseDrafts.map((p, i) => (
                  <li key={p.key} className="flex items-center gap-2">
                    <Input
                      value={p.name}
                      onChange={(e) => updatePhaseDraft(p.key, { name: e.target.value })}
                      placeholder={`Phase ${i + 1}`}
                      maxLength={200}
                    />
                    {p.id === null ? (
                      <button
                        type="button"
                        onClick={() => removePhase(p.key)}
                        aria-label="Remove phase"
                        className="shrink-0 rounded-control px-2 py-1 text-sm text-ink-muted transition hover:text-critical"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="w-7 shrink-0" aria-hidden />
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <Button type="button" variant="ghost" onClick={addPhase}>
                  + Add phase
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                Optional start and end dates per phase. Leave blank to derive them from tasks later.
              </p>
              {namedPhases.length === 0 ? (
                <p className="text-sm text-ink-muted">Add a phase first to set dates.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {namedPhases.map((p) => (
                    <li key={p.key} className="flex flex-wrap items-center gap-2">
                      <span className="w-40 shrink-0 truncate text-sm font-medium text-ink">
                        {p.name.trim()}
                      </span>
                      <input
                        type="date"
                        aria-label={`${p.name.trim()} start date`}
                        value={p.startDate}
                        onChange={(e) => updatePhaseDraft(p.key, { startDate: e.target.value })}
                        className={DATE_INPUT_CLASS}
                      />
                      <span className="text-ink-muted">→</span>
                      <input
                        type="date"
                        aria-label={`${p.name.trim()} end date`}
                        value={p.endDate}
                        min={p.startDate || undefined}
                        onChange={(e) => updatePhaseDraft(p.key, { endDate: e.target.value })}
                        className={DATE_INPUT_CLASS}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                Add key dates for the project — a lease signing, a launch, a deadline.
              </p>
              <ul className="flex flex-col gap-2">
                {milestoneDrafts.map((mi) => (
                  <li key={mi.key} className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={mi.title}
                        onChange={(e) => updateMilestoneDraft(mi.key, { title: e.target.value })}
                        placeholder="Milestone"
                        maxLength={200}
                      />
                    </div>
                    <input
                      type="date"
                      aria-label="Milestone date"
                      value={mi.targetDate}
                      onChange={(e) => updateMilestoneDraft(mi.key, { targetDate: e.target.value })}
                      className={DATE_INPUT_CLASS}
                    />
                    {mi.id === null ? (
                      <button
                        type="button"
                        onClick={() => removeMilestone(mi.key)}
                        aria-label="Remove milestone"
                        className="shrink-0 rounded-control px-2 py-1 text-sm text-ink-muted transition hover:text-critical"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="w-7 shrink-0" aria-hidden />
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <Button type="button" variant="ghost" onClick={addMilestone}>
                  + Add milestone
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                Seed a few starting tasks under each phase — one per line. This only adds tasks.
              </p>
              {namedPhases.length === 0 ? (
                <p className="text-sm text-ink-muted">Add a phase first to seed tasks.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {namedPhases.map((p) => (
                    <li key={p.key} className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink">{p.name.trim()}</span>
                      <textarea
                        value={p.tasks}
                        onChange={(e) => updatePhaseDraft(p.key, { tasks: e.target.value })}
                        rows={3}
                        placeholder="One task per line"
                        className="w-full resize-y rounded-control border border-subtle bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-subtle p-6 pt-4">
          {error ? (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          ) : (
            <span className="text-xs text-ink-muted">
              {isEditing ? "Edits add to or adjust existing items — nothing is deleted." : ""}
            </span>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={saving}
              >
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
            )}
            {isLast ? (
              <Button type="button" onClick={commit} disabled={saving}>
                {saving ? "Saving…" : isEditing ? "Save changes" : "Finish setup"}
              </Button>
            ) : (
              <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={saving}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
