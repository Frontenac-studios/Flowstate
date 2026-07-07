"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useTRPC } from "@/trpc/client";

import ConfirmDialog from "./ConfirmDialog";

type Props = {
  projectId: string;
  projectName: string;
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

export default function ImportHistoryView({ projectId, projectName }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [undoTarget, setUndoTarget] = useState<UndoTarget | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const importsQuery = useQuery(trpc.taskBulkImports.listByProject.queryOptions({ projectId }));

  const undoTasksQuery = useQuery({
    ...(undoTarget
      ? trpc.taskBulkImports.listTasksForImport.queryOptions({ importId: undoTarget.importId })
      : {
          queryKey: trpc.taskBulkImports.listTasksForImport.queryKey({
            importId: "00000000-0000-0000-0000-000000000000",
          }),
          queryFn: async () => [] as { id: string; title: string }[],
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
      onError: (error) => {
        setUndoTarget(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.taskBulkImports.listByProject.queryKey({ projectId }),
        });
        setStatusMessage(error.message);
      },
    })
  );

  useEffect(() => {
    if (!statusMessage) return;
    const t = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [statusMessage]);

  const imports = importsQuery.data ?? [];

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href={`/projects/${projectId}`}
          className="w-fit text-meta text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        >
          ← {projectName}
        </Link>
        <div>
          <h1 className="text-title font-medium text-ink">Import history</h1>
          <p className="mt-0.5 text-meta text-ink-muted">
            Multi-line ⌘↵ submissions in this project
          </p>
        </div>
      </div>

      {statusMessage ? (
        <p role="status" className="text-meta text-ink-muted">
          {statusMessage}
        </p>
      ) : null}

      {importsQuery.isLoading ? (
        <p className="text-body text-ink-muted">Loading…</p>
      ) : imports.length === 0 ? (
        <div className="rounded-card border border-subtle bg-surface px-6 py-12 text-center shadow-surface">
          <p className="font-medium text-ink">No bulk imports yet</p>
          <p className="mt-1 text-meta text-ink-muted">
            Paste multiple lines in a column and press ⌘↵ to create an import.
          </p>
        </div>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {imports.map((row) => {
            const undone = row.undoneAt != null;
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-row border border-subtle bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {row.taskCount} {row.taskCount === 1 ? "task" : "tasks"}
                  </p>
                  <p className="text-caption text-ink-faint">
                    {formatImportTime(row.createdAt)}
                    {undone ? " · Undone" : " · Active"}
                  </p>
                </div>
                {!undone ? (
                  <button
                    type="button"
                    className="focus-visible:text-on-accent shrink-0 rounded-control border-[1.5px] border-ink px-3 py-1 text-meta text-ink transition hover:bg-[var(--accent-soft)] focus:outline-none focus-visible:bg-ink disabled:opacity-50"
                    disabled={undoMutation.isPending}
                    onClick={() => setUndoTarget({ importId: row.id, taskCount: row.taskCount })}
                  >
                    Undo
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

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
        confirmDisabled={undoMutation.isPending}
        destructive
        onCancel={() => {
          if (undoMutation.isPending) return;
          setUndoTarget(null);
        }}
        onConfirm={() => {
          if (!undoTarget || undoMutation.isPending) return;
          undoMutation.mutate({ importId: undoTarget.importId });
        }}
      >
        <section aria-label="Tasks to remove">
          {undoTasksQuery.isLoading ? (
            <p className="mt-3 text-body text-ink-muted">Loading tasks…</p>
          ) : undoTasksQuery.isError ? (
            <p className="mt-3 text-body text-ink-muted">
              Couldn&apos;t load task preview — you can still undo.
            </p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-row border border-subtle px-3 py-2">
              {(undoTasksQuery.data ?? []).map((task) => (
                <li key={task.id} className="truncate text-body text-ink">
                  {task.title}
                </li>
              ))}
            </ul>
          )}
        </section>
        {undoMutation.isError ? (
          <p role="alert" className="mt-4 text-sm text-critical">
            Couldn&apos;t undo this import. Please try again.
          </p>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}
