"use client";

import { useEffect, useState } from "react";

import { EstimateConfidenceHint } from "@/components/kash/projects/EstimateConfidenceHint";
import Input from "@/components/kash/ui/Input";
import Textarea from "@/components/kash/ui/Textarea";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import {
  collectSubtreeTasks,
  derivePhaseRangeFromTasks,
  hasManualPhaseDate,
  resolveEffectivePhaseRange,
  type ProjectTree,
} from "@/lib/projects/phase-tree";
import { weightedProgressForTasks } from "@/lib/projects/progress-task-input";
import { formatDuration } from "@/lib/time/duration";

import type { ProjectPhase, ProjectTask } from "./types";

type Node = ProjectTree<ProjectPhase, ProjectTask>["rootPhases"][number];

type PhasePatch = {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type Props = {
  node: Node;
  category: ProjectCategory;
  dayPriorityTaskIds: ReadonlySet<string>;
  timeSpentSeconds?: number;
  estimateSampleCount?: number;
  onUpdate: (patch: PhasePatch) => void;
  onRequestDelete: () => void;
  pending: boolean;
};

function dateSideLabel(side: "Start" | "End", manual: boolean): string {
  return manual ? side : `${side} (from tasks)`;
}

export default function PhaseDetail({
  node,
  category,
  dayPriorityTaskIds,
  timeSpentSeconds = 0,
  estimateSampleCount = 0,
  onUpdate,
  onRequestDelete,
  pending,
}: Props) {
  const { phase } = node;
  const isLeaf = node.children.length === 0;
  const effective = resolveEffectivePhaseRange(node);
  const taskSnap = isLeaf ? derivePhaseRangeFromTasks(node.tasks) : null;
  const subtreeTasks = collectSubtreeTasks(node);
  const progress = weightedProgressForTasks(
    subtreeTasks.map((task) => ({
      id: task.id,
      completedAt: task.completedAt,
      isTop3: task.isTop3,
    })),
    dayPriorityTaskIds
  );
  const stripe = categorySolidVar(category);

  const [name, setName] = useState(phase.name);
  const [description, setDescription] = useState(phase.description ?? "");

  useEffect(() => {
    setName(phase.name);
    setDescription(phase.description ?? "");
  }, [phase.id, phase.name, phase.description]);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === phase.name) {
      setName(phase.name);
      return;
    }
    onUpdate({ name: trimmed });
  };

  const commitDescription = () => {
    const next = description.trim();
    if (next === (phase.description ?? "")) return;
    onUpdate({ description: next || null });
  };

  const clearAllDates = () => {
    if (!hasManualPhaseDate(phase)) return;
    onUpdate({ startDate: null, endDate: null });
  };

  return (
    <div className="flex flex-col gap-4">
      {subtreeTasks.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Progress</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full"
              style={{ width: `${progress.percent}%`, backgroundColor: stripe }}
            />
          </div>
        </div>
      ) : null}

      {timeSpentSeconds > 0 ? (
        <p className="text-xs text-ink-muted">
          Time spent: {formatDuration(timeSpentSeconds)}
          {" · "}
          <EstimateConfidenceHint sampleCount={estimateSampleCount} />
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Phase</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={200}
          aria-label="Phase name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          placeholder="Add a description…"
          rows={2}
          maxLength={2000}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Dates</span>
        {isLeaf ? (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-muted">
                  {dateSideLabel("Start", phase.startDate !== null)}
                </label>
                <Input
                  type="date"
                  value={phase.startDate ?? ""}
                  max={phase.endDate ?? taskSnap?.end ?? undefined}
                  onChange={(e) => onUpdate({ startDate: e.target.value || null })}
                  aria-label="Start date"
                />
              </div>
              <span className="pb-2 text-ink-muted">→</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink-muted">
                  {dateSideLabel("End", phase.endDate !== null)}
                </label>
                <Input
                  type="date"
                  value={phase.endDate ?? ""}
                  min={phase.startDate ?? taskSnap?.start ?? undefined}
                  onChange={(e) => onUpdate({ endDate: e.target.value || null })}
                  aria-label="End date"
                />
              </div>
            </div>
            {effective.start && effective.end ? (
              <p className="text-sm text-ink-muted">
                Calendar: {effective.start} → {effective.end}
                {!hasManualPhaseDate(phase) ? " (from scheduled tasks)" : null}
              </p>
            ) : (
              <p className="text-sm text-ink-muted">
                No calendar range yet — set dates or schedule tasks in this phase.
              </p>
            )}
            {hasManualPhaseDate(phase) ? (
              <button
                type="button"
                onClick={clearAllDates}
                disabled={pending}
                className="self-start text-xs text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] disabled:opacity-50"
              >
                Clear all dates (use task schedules)
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            {effective.start && effective.end
              ? `${effective.start} → ${effective.end} (derived from sub-phases)`
              : "No dated sub-phases yet."}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRequestDelete}
        disabled={pending}
        className="self-start text-sm text-critical transition hover:underline focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] disabled:opacity-50"
      >
        Delete phase
      </button>
    </div>
  );
}
