"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/kash/ui/Button";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { cadenceLabel, groupByTheme } from "@/lib/care/labels";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/client";

type Catalog = RouterOutputs["care"]["catalog"];

type Props = {
  catalog: Catalog;
};

/**
 * The "Suggested" zone — the seed catalog minus already-adopted keys, grouped by
 * theme. Each Adopt copies the seed into the user's library (care.adopt) and
 * refreshes both the catalog (the row disappears) and the practices list.
 */
export default function SuggestedSection({ catalog }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const adopt = useMutation(
    trpc.care.adopt.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.care.catalog.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.care.listActivities.queryKey() });
      },
      onError: () =>
        toast({ message: "Couldn't adopt this practice. Please try again.", variant: "error" }),
    })
  );

  const groups = groupByTheme(catalog);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-subtitle font-medium text-ink">Suggested</h2>

      {groups.length === 0 ? (
        <p className="rounded-card border border-subtle bg-surface px-4 py-6 text-center text-meta text-ink-faint shadow-surface">
          You&apos;ve adopted every suggestion. Create your own above any time.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.theme} className="flex flex-col gap-1">
            <h3 className="px-2 text-caption font-medium uppercase tracking-wide text-ink-faint">
              {group.label}
            </h3>
            {group.items.map((practice) => {
              const hint = cadenceLabel(practice.cadence);
              const pending = adopt.isPending && adopt.variables?.key === practice.key;
              return (
                <div
                  key={practice.key}
                  className="flex items-center gap-3 rounded-row px-2 py-1.5 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-ink">{practice.title}</p>
                    {hint ? <p className="text-caption text-ink-faint">{hint}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={adopt.isPending}
                    onClick={() => adopt.mutate({ key: practice.key })}
                  >
                    {pending ? "Adding…" : "Adopt"}
                  </Button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </section>
  );
}
