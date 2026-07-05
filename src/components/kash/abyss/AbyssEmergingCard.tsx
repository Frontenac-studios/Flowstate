"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Sparkles, X, withKashIcon } from "@/components/kash/ui/icon";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { normalizeTag } from "@/lib/abyss/tags";
import { useTRPC } from "@/trpc/client";

const SparkleIcon = withKashIcon(Sparkles);
const CloseIcon = withKashIcon(X);
const ABYSS_INPUT_FOCUS = "focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]";
const ABYSS_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-abyss-accent focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-surface";

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
  const { toast } = useToast();
  const [name, setName] = useState("");

  const setTags = useMutation(trpc.abyss.setTags.mutationOptions());
  const suggestName = useMutation(
    trpc.abyss.suggestClusterName.mutationOptions({
      onSuccess: (result) => {
        if (result.name) setName(result.name);
      },
      onError: () =>
        toast({ message: "Couldn't suggest a name. Please try again.", variant: "error" }),
    })
  );

  const tag = normalizeTag(name);
  const busy = setTags.isPending || suggestName.isPending;

  const apply = async () => {
    if (!tag) return;
    // Tag each member independently so one failure doesn't abort the rest; report
    // partial failure instead of silently leaving some members untagged.
    const results = await Promise.allSettled(
      members.map((member) =>
        setTags.mutateAsync({ id: member.id, tags: [...(member.tags ?? []), tag] })
      )
    );
    void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast({
        message: `Couldn't tag ${failed} of ${members.length}. Please try again.`,
        variant: "error",
      });
      return;
    }
    onDismiss();
  };

  return (
    <section className="rounded-card border border-abyss-border-strong bg-abyss-surface p-3">
      <div className="flex items-center gap-2">
        <SparkleIcon size={14} className="text-cat-adulting" />
        <span className="text-meta font-medium text-abyss-ink">
          You keep parking similar things
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`rounded-control p-0.5 text-abyss-ink-faint transition-colors hover:text-abyss-ink ${ABYSS_BTN_FOCUS}`}
        >
          <CloseIcon size={14} />
        </button>
      </div>

      <p className="mt-1.5 pl-[calc(var(--icon-sm)+var(--space-3))] text-caption text-abyss-ink-muted">
        {members.map((member) => member.title).join(" · ")}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-[calc(var(--icon-sm)+var(--space-3))]">
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
          className={`w-44 rounded-control bg-abyss-surface-2 px-2 py-1 text-meta text-abyss-ink placeholder:text-abyss-ink-faint ${ABYSS_INPUT_FOCUS}`}
          aria-label="Pattern name"
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={busy || !tag}
          className={`rounded-control bg-abyss-accent px-2.5 py-1 text-meta font-medium text-abyss-on-accent disabled:opacity-40 ${ABYSS_BTN_FOCUS}`}
        >
          Tag {members.length}
        </button>
        <button
          type="button"
          onClick={() => suggestName.mutate({ titles: members.map((m) => m.title) })}
          disabled={busy}
          className={`flex items-center gap-1 text-meta text-abyss-ink-muted transition-colors hover:text-abyss-ink disabled:opacity-40 ${ABYSS_BTN_FOCUS}`}
        >
          <SparkleIcon size={12} />
          {suggestName.isPending ? "thinking…" : "suggest a name"}
        </button>
      </div>
    </section>
  );
}
