"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useTRPC } from "@/trpc/client";

type Direction = { id: string; statement: string };

/**
 * One Direction on the Quarter surface (W5, §2). A sentence, editable in place,
 * with only the "applied line" beneath it — never a progress bar, because the
 * absence of a measure is the whole point. The applied line reads the Filter's
 * use of this Direction; until the Filter ships (W10) it says so plainly rather
 * than showing a fake zero.
 */
export default function DirectionCard({ direction }: { direction: Direction }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(direction.statement);

  const invalidate = () => queryClient.invalidateQueries(trpc.directions.list.pathFilter());

  const update = useMutation(
    trpc.directions.update.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setEditing(false);
      },
    })
  );
  const retire = useMutation(
    trpc.directions.retire.mutationOptions({ onSuccess: () => void invalidate() })
  );

  return (
    <div className="rounded-card border border-subtle bg-surface p-4 shadow-surface">
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            className="w-full rounded-control border border-subtle bg-surface-2 p-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(direction.statement);
                setEditing(false);
              }}
              className="rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => draft.trim() && update.mutate({ id: direction.id, statement: draft.trim() })}
              disabled={update.isPending || !draft.trim()}
              className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="group">
          <p className="text-body text-ink">{direction.statement}</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-caption text-ink-muted">Not yet scored — the Filter will light this up.</p>
            <div className="flex gap-3 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setDraft(direction.statement);
                  setEditing(true);
                }}
                className="text-caption font-medium text-ink-muted transition hover:text-ink"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => retire.mutate({ id: direction.id })}
                disabled={retire.isPending}
                className="text-caption font-medium text-ink-muted transition hover:text-critical disabled:opacity-50"
              >
                Retire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
