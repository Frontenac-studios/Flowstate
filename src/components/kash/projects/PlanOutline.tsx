"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { flattenPlanOutline, type PlanOutlineRow } from "@/lib/projects/flatten-plan-outline";
import {
  nextSortOrder,
  resolveIndent,
  resolveOutdent,
  type OutlineMove,
} from "@/lib/projects/plan-outline-moves";
import type { ProjectTree } from "@/lib/projects/phase-tree";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import type { ProjectPhase, ProjectTask } from "./types";

type Props = {
  projectId: string;
  category: ProjectCategory;
  tree: ProjectTree<ProjectPhase, ProjectTask>;
};

const CELL = "whitespace-nowrap px-2 py-1 text-right text-meta";
const GHOST =
  "w-full rounded-control border border-transparent bg-transparent px-1 py-0.5 text-right text-meta text-ink-muted outline-none hover:border-subtle focus:border-ink focus:bg-surface";

/**
 * Plan mode — the whole tree at once, editable in place (Kash 3.2, decision 2D).
 *
 * The grammar is position, not punctuation. A row at the top level is a phase; a row
 * indented under one is a task. Tab and Shift+Tab move a row between levels, and that
 * is the entire structural vocabulary — replacing `;;;` and `Parent//+ Child`, which
 * were documented in a single chip you had to click and taught wrongly on three
 * other surfaces.
 *
 * **Indent moves, it never converts** (model A). A task carries logged time, tags,
 * completion and priority; a phase carries dates, an estimate and children. There is
 * no conversion on the server, so a keystroke that changed a row's kind would have to
 * insert one row and delete the other, and the logged time behind the invoices would
 * be gone. Outdenting a task out of its last phase makes it a loose project task,
 * which is a state `tasks.phaseId` already models.
 */
export default function PlanOutline({ projectId, category, tree }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: rollups } = useQuery(trpc.projects.getTimeRollups.queryOptions({ projectId }));
  const { data: burnReads = [] } = useQuery(trpc.projects.burn.queryOptions({ projectId }));

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The row to put the caret in once the tree comes back with it.
  const pendingFocus = useRef<string | null>(null);

  const hotPhaseIds = useMemo(() => {
    const burn = burnReads.find((read) => read.projectId === projectId)?.burn;
    return new Set(
      (burn?.phases ?? []).filter((p) => p.burn.state === "hot").map((p) => p.phaseId)
    );
  }, [burnReads, projectId]);

  const rows = useMemo<PlanOutlineRow[]>(
    () =>
      flattenPlanOutline({
        tree,
        secondsByPhaseId: rollups?.byPhaseId ?? {},
        secondsByTaskId: rollups?.byTaskId ?? {},
        hotPhaseIds,
      }),
    [tree, rollups, hotPhaseIds]
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.phases.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
  }, [queryClient, trpc, projectId]);

  const onError = useCallback((label: string) => {
    return (err: unknown) => {
      console.error(`[PlanOutline] ${label} failed`, err);
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "That didn't save."
      );
    };
  }, []);

  const onDone = useCallback(() => {
    setError(null);
    refresh();
  }, [refresh]);

  const updatePhase = useMutation(
    trpc.phases.update.mutationOptions({ onSuccess: onDone, onError: onError("phases.update") })
  );
  const setPhaseEstimate = useMutation(
    trpc.phases.setEstimate.mutationOptions({
      onSuccess: onDone,
      onError: onError("phases.setEstimate"),
    })
  );
  const createPhase = useMutation(
    trpc.phases.create.mutationOptions({
      onSuccess: (row) => {
        pendingFocus.current = row.id;
        onDone();
      },
      onError: onError("phases.create"),
    })
  );
  const updateTask = useMutation(
    trpc.tasks.update.mutationOptions({ onSuccess: onDone, onError: onError("tasks.update") })
  );
  const moveTask = useMutation(
    trpc.tasks.moveToPhase.mutationOptions({
      onSuccess: onDone,
      onError: onError("tasks.moveToPhase"),
    })
  );
  const createTask = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: (row) => {
        pendingFocus.current = row.id;
        onDone();
      },
      onError: onError("tasks.create"),
    })
  );

  const busy =
    updatePhase.isPending ||
    setPhaseEstimate.isPending ||
    createPhase.isPending ||
    updateTask.isPending ||
    moveTask.isPending ||
    createTask.isPending;

  const applyMove = useCallback(
    (move: OutlineMove | null) => {
      if (!move) return;
      if (move.kind === "phase") {
        updatePhase.mutate({
          id: move.id,
          parentPhaseId: move.parentPhaseId,
          sortOrder: nextSortOrder(rows, "phase", move.parentPhaseId, move.id),
        });
      } else {
        moveTask.mutate({
          id: move.id,
          phaseId: move.phaseId,
          sortOrder: nextSortOrder(rows, "task", move.phaseId, move.id),
        });
      }
    },
    [rows, updatePhase, moveTask]
  );

  /**
   * Enter adds a task, Shift+Enter adds a phase — both as siblings of the row you are
   * on, so a new row lands where you are looking rather than at the bottom.
   */
  const addRow = useCallback(
    (row: PlanOutlineRow, kind: "phase" | "task") => {
      // A new row belongs beside the current one: inside the same phase for a task,
      // under the same parent for a phase.
      const parentPhaseId = row.kind === "phase" && kind === "task" ? row.id : row.parentPhaseId;

      if (kind === "phase") {
        createPhase.mutate({ projectId, parentPhaseId, name: "New phase" });
        return;
      }
      createTask.mutate({
        title: "New task",
        projectId,
        phaseId: parentPhaseId,
      });
    },
    [createPhase, createTask, projectId]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, row: PlanOutlineRow, index: number) => {
      if (event.key === "Tab") {
        event.preventDefault();
        applyMove(event.shiftKey ? resolveOutdent(rows, index) : resolveIndent(rows, index));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
        addRow(row, event.shiftKey ? "phase" : "task");
        return;
      }
      if (event.key === "Escape") {
        event.currentTarget.value = row.title;
        event.currentTarget.blur();
      }
    },
    [rows, applyMove, addRow]
  );

  const commitTitle = useCallback(
    (row: PlanOutlineRow, next: string) => {
      const trimmed = next.trim();
      if (trimmed.length === 0 || trimmed === row.title) return;
      if (row.kind === "phase") updatePhase.mutate({ id: row.id, name: trimmed });
      else updateTask.mutate({ id: row.id, title: trimmed });
    },
    [updatePhase, updateTask]
  );

  const commitDue = useCallback(
    (row: PlanOutlineRow, next: string) => {
      const value = next === "" ? null : next;
      if (value === row.due) return;
      // A phase's Due is its end date. A task's is the day it is scheduled for.
      if (row.kind === "phase") updatePhase.mutate({ id: row.id, endDate: value });
      else updateTask.mutate({ id: row.id, scheduledDate: value });
    },
    [updatePhase, updateTask]
  );

  const commitEstimate = useCallback(
    (row: PlanOutlineRow, next: string) => {
      if (row.kind !== "phase") return;
      const trimmed = next.trim();
      if (trimmed === "") {
        if (row.estimateHours !== null)
          setPhaseEstimate.mutate({ id: row.id, estimateHours: null });
        return;
      }
      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(parsed) || parsed < 0) return;
      setPhaseEstimate.mutate({ id: row.id, estimateHours: parsed });
    },
    [setPhaseEstimate]
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-center">
        <p className="text-body text-ink-muted">Nothing planned yet.</p>
        <button
          type="button"
          onClick={() => createPhase.mutate({ projectId, parentPhaseId: null, name: "New phase" })}
          className="kash-focus-visible mt-3 rounded-control border border-ink px-3 py-1 text-meta text-ink"
        >
          Add a phase
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-body">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th
                scope="col"
                className="px-3 py-2 text-left text-caption font-normal text-ink-faint"
              >
                Phase and tasks
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right text-caption font-normal text-ink-faint"
              >
                Due
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right text-caption font-normal text-ink-faint"
              >
                Est
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right text-caption font-normal text-ink-faint"
              >
                Logged
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isPhase = row.kind === "phase";
              const autoFocus = pendingFocus.current === row.id;
              if (autoFocus) pendingFocus.current = null;
              return (
                <tr
                  key={`${row.kind}-${row.id}`}
                  className={`border-b border-subtle last:border-b-0 ${
                    focusedId === row.id ? "bg-surface-2" : ""
                  }`}
                >
                  <td className="py-0.5 pl-3 pr-2">
                    <span
                      className="flex min-h-[26px] items-center gap-2"
                      style={{ paddingLeft: `${row.depth * 22}px` }}
                    >
                      {isPhase ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: categorySolidVar(category),
                            boxShadow: "0 0 0 1px var(--mark-ring)",
                          }}
                          aria-hidden
                        />
                      ) : null}
                      <input
                        defaultValue={row.title}
                        // Remount when the title changes upstream so the uncontrolled
                        // field never drifts from the server.
                        key={`${row.id}-${row.title}`}
                        autoFocus={autoFocus}
                        aria-label={isPhase ? `Phase name` : `Task title`}
                        onFocus={() => setFocusedId(row.id)}
                        onBlur={(e) => {
                          setFocusedId((current) => (current === row.id ? null : current));
                          commitTitle(row, e.target.value);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, row, index)}
                        className={`w-full rounded-control border border-transparent bg-transparent px-1 py-0.5 outline-none hover:border-subtle focus:border-ink focus:bg-surface ${
                          isPhase ? "font-medium text-ink" : "text-ink-muted"
                        } ${row.completed ? "line-through opacity-60" : ""}`}
                      />
                    </span>
                  </td>

                  <td className={CELL}>
                    <input
                      type="date"
                      defaultValue={row.due ?? ""}
                      key={`${row.id}-due-${row.due ?? "none"}`}
                      aria-label={isPhase ? "Phase end date" : "Task date"}
                      onBlur={(e) => commitDue(row, e.target.value)}
                      className={`${GHOST} w-[112px]`}
                    />
                  </td>

                  <td className={CELL}>
                    {isPhase ? (
                      <input
                        inputMode="numeric"
                        defaultValue={row.estimateHours ?? ""}
                        key={`${row.id}-est-${row.estimateHours ?? "none"}`}
                        aria-label="Estimated hours"
                        placeholder="—"
                        onBlur={(e) => commitEstimate(row, e.target.value)}
                        className={`${GHOST} w-[44px]`}
                      />
                    ) : (
                      <span className="pr-1 text-ink-faint opacity-60">—</span>
                    )}
                  </td>

                  <td
                    className={`${CELL} pr-3 ${row.hot ? "text-critical" : "text-ink-faint"}`}
                    title={row.hot ? "Budget is running ahead of the work" : undefined}
                  >
                    {row.actualHours === null ? (
                      <span className="opacity-60">—</span>
                    ) : (
                      `${row.actualHours}h`
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface-2 px-3 py-2">
        <span className="text-caption text-ink-faint">
          <kbd className="rounded border border-border bg-surface px-1">tab</kbd> indent
        </span>
        <span className="text-caption text-ink-faint">
          <kbd className="rounded border border-border bg-surface px-1">⇧tab</kbd> outdent
        </span>
        <span className="text-caption text-ink-faint">
          <kbd className="rounded border border-border bg-surface px-1">↵</kbd> new task
        </span>
        <span className="text-caption text-ink-faint">
          <kbd className="rounded border border-border bg-surface px-1">⇧↵</kbd> new phase
        </span>
        <span className="ml-auto text-caption" role="status">
          {error ? (
            <span className="text-critical">{error}</span>
          ) : busy ? (
            <span className="text-ink-faint">Saving…</span>
          ) : (
            <span className="text-ink-faint">Saved</span>
          )}
        </span>
      </div>
    </div>
  );
}
