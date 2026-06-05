"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useTRPC } from "@/trpc/client";

import ConfirmDialog from "./ConfirmDialog";

type Props = {
  projectId: string;
};

function formatImportTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type UndoTarget = { importId: string; taskCount: number };

export default function ImportHistoryPanel({ projectId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [undoTarget, setUndoTarget] = useState<UndoTarget | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const importsQuery = useQuery({
    ...trpc.taskBulkImports.listByProject.queryOptions({ projectId }),
    enabled: open,
  });

  const undoTasksQuery = useQuery({
    ...trpc.taskBulkImports.listTasksForImport.queryOptions({
      importId: undoTarget?.importId ?? "",
    }),
    enabled: undoTarget !== null,
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.phases.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.taskBulkImports.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  };

  const undoMutation = useMutation(
    trpc.taskBulkImports.undo.mutationOptions({
      onSuccess: (result) => {
        invalidateAll();
        setUndoTarget(null);
        setStatusMessage(
          result.deletedCount === 1
            ? "Undid import — 1 task removed."
            : `Undid import — ${result.deletedCount} tasks removed.`
        );
      },
    })
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!statusMessage) return;
    const t = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [statusMessage]);

  const imports = importsQuery.data ?? [];

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`rounded-full px-3 py-1 text-sm transition ${
          open ? "bg-kash-accent text-white" : "text-kash-ink-muted hover:text-kash-ink"
        }`}
      >
        Imports
      </button>

      {statusMessage ? (
        <p className="absolute right-0 top-full z-20 mt-1 max-w-xs text-xs text-kash-ink-muted">
          {statusMessage}
        </p>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label="Bulk import history"
          className="glass-panel-strong absolute right-0 top-full z-20 mt-2 w-80 p-3 shadow-lg"
        >
          <h2 className="text-sm font-semibold text-kash-ink">Bulk imports</h2>
          <p className="mt-0.5 text-xs text-kash-ink-muted">
            Multi-line ⌘↵ submissions in this project
          </p>

          {importsQuery.isLoading ? (
            <p className="mt-3 text-sm text-kash-ink-muted">Loading…</p>
          ) : imports.length === 0 ? (
            <p className="mt-3 text-sm text-kash-ink-muted">
              No bulk imports yet — paste multiple lines in a column and press ⌘↵.
            </p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {imports.map((row) => {
                const undone = row.undoneAt != null;
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-kash border border-white/40 px-2 py-1.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-kash-ink">
                        {row.taskCount} {row.taskCount === 1 ? "task" : "tasks"}
                      </p>
                      <p className="text-xs text-kash-ink-muted">
                        {formatImportTime(row.createdAt)}
                        {undone ? " · Undone" : " · Active"}
                      </p>
                    </div>
                    {!undone ? (
                      <button
                        type="button"
                        className="glass-btn-ghost shrink-0 px-2 py-1 text-xs"
                        disabled={undoMutation.isPending}
                        onClick={() =>
                          setUndoTarget({ importId: row.id, taskCount: row.taskCount })
                        }
                      >
                        Undo
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={undoTarget !== null}
        opaque
        title="Undo bulk import?"
        message={
          undoTarget
            ? `This permanently deletes all ${undoTarget.taskCount} tasks from this batch, including any edits, completions, time tracked, or Today/Week placements.`
            : ""
        }
        confirmLabel={undoMutation.isPending ? "Undoing…" : "Undo import"}
        confirmDisabled={undoTasksQuery.isLoading || undoMutation.isPending}
        destructive
        onCancel={() => setUndoTarget(null)}
        onConfirm={() => {
          if (!undoTarget) return;
          undoMutation.mutate({ importId: undoTarget.importId });
        }}
      >
        <section aria-label="Tasks to remove">
          {undoTasksQuery.isLoading ? (
            <p className="mt-3 text-sm text-kash-ink-muted">Loading tasks…</p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-kash border border-white/40 px-2 py-2">
              {(undoTasksQuery.data ?? []).map((task) => (
                <li key={task.id} className="truncate text-sm text-kash-ink">
                  {task.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      </ConfirmDialog>
    </div>
  );
}
