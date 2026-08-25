"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Input from "@/components/kash/ui/Input";
import { useTRPC } from "@/trpc/client";

/**
 * Manage the controlled time-tag vocabulary (W2e). A tag is invoice structure, so
 * it is curated here rather than free-typed on an entry — add, rename, remove.
 */
export function TimeTagsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery(trpc.timeTags.list.queryOptions());
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: trpc.timeTags.list.queryKey() });

  const createMutation = useMutation(
    trpc.timeTags.create.mutationOptions({ onSuccess: invalidate })
  );
  const renameMutation = useMutation(
    trpc.timeTags.rename.mutationOptions({ onSuccess: invalidate })
  );
  const deleteMutation = useMutation(
    trpc.timeTags.delete.mutationOptions({ onSuccess: invalidate })
  );

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const error =
    createMutation.error?.message ?? renameMutation.error?.message ?? deleteMutation.error?.message;

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate({ name }, { onSuccess: () => setNewName("") });
  };

  const commitRename = (id: string) => {
    const name = draft.trim();
    if (name) renameMutation.mutate({ id, name });
    setEditingId(null);
  };

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Time tags</h2>
      <p className="mt-1 text-sm text-ink-muted">
        A short, controlled list used to group time on invoices — a tag is invoice structure, so it
        lives here rather than being typed on each entry.
      </p>

      <div className="mt-4 flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="New tag (e.g. Development)"
          className="flex-1 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={createMutation.isPending || newName.trim() === ""}
          className="rounded-control bg-ink px-3 py-1.5 text-sm font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-3 flex flex-col gap-1.5">
        {tags.length === 0 ? (
          <li className="text-sm text-ink-faint">No tags yet.</li>
        ) : (
          tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 rounded-control border border-subtle bg-surface px-3 py-1.5"
            >
              {editingId === tag.id ? (
                <Input
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(tag.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(tag.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 text-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(tag.id);
                    setDraft(tag.name);
                  }}
                  className="flex-1 text-left text-sm text-ink"
                >
                  {tag.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteMutation.mutate({ id: tag.id })}
                disabled={deleteMutation.isPending}
                className="text-sm text-ink-muted transition hover:text-critical disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
