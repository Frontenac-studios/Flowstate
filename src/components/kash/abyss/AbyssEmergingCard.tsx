"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { normalizeTag } from "@/lib/abyss/tags";
import { useTRPC } from "@/trpc/client";

import { CloseIcon, SparkleIcon } from "./icons";

type Member = { id: string; title: string; tags: string[] | null };
type Props = { members: Member[]; onDismiss: () => void };

/**
 * Emerging-pattern card (§7A): a cohesive cluster of un-tagged items the user keeps
 * parking. Naming it applies a new tag to every member (turning the cluster into a
 * constellation). "Suggest a name" is one on-request Haiku call. Dismissible.
 */
export default function AbyssEmergingCard({ members, onDismiss }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const setTags = useMutation(trpc.abyss.setTags.mutationOptions());
  const suggestName = useMutation(
    trpc.abyss.suggestClusterName.mutationOptions({
      onSuccess: (result) => {
        if (result.name) setName(result.name);
      },
    })
  );

  const tag = normalizeTag(name);
  const busy = setTags.isPending || suggestName.isPending;

  const apply = async () => {
    if (!tag) return;
    await Promise.all(
      members.map((member) =>
        setTags.mutateAsync({ id: member.id, tags: [...(member.tags ?? []), tag] })
      )
    );
    void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
    onDismiss();
  };

  return (
    <section className="rounded-card border border-abyss-border-strong bg-abyss-surface p-3">
      <div className="flex items-center gap-2">
        <SparkleIcon size={15} className="text-cat-adulting" />
        <span className="text-meta font-medium text-abyss-ink">
          You keep parking similar things
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-control p-0.5 text-abyss-ink-faint transition-colors hover:text-abyss-ink"
        >
          <CloseIcon size={15} />
        </button>
      </div>

      <p className="mt-1.5 pl-[23px] text-caption text-abyss-ink-muted">
        {members.map((member) => member.title).join(" · ")}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-[23px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder="Name this pattern…"
          maxLength={32}
          className="w-44 rounded-control bg-abyss-surface-2 px-2 py-1 text-meta text-abyss-ink placeholder:text-abyss-ink-faint focus:outline-none"
          aria-label="Pattern name"
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={busy || !tag}
          className="rounded-control bg-abyss-accent px-2.5 py-1 text-meta font-medium text-abyss-on-accent disabled:opacity-40"
        >
          Tag {members.length}
        </button>
        <button
          type="button"
          onClick={() => suggestName.mutate({ titles: members.map((m) => m.title) })}
          disabled={busy}
          className="flex items-center gap-1 text-meta text-abyss-ink-muted transition-colors hover:text-abyss-ink disabled:opacity-40"
        >
          <SparkleIcon size={12} />
          {suggestName.isPending ? "thinking…" : "suggest a name"}
        </button>
      </div>
    </section>
  );
}
