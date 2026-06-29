"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/kash/ui/Button";
import { useTRPC } from "@/trpc/client";

type Props = {
  anchorDate: string;
};

export default function ProtectedWeekBar({ anchorDate }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const weekInput = { anchorDate };

  const { data: blocks = [] } = useQuery(trpc.protectedBlocks.listForWeek.queryOptions(weekInput));
  const { data: templates = [] } = useQuery(trpc.protectedBlocks.listTemplates.queryOptions());

  const proposedCount = blocks.filter((b) => b.status === "proposed").length;

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForWeek.queryKey(weekInput),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForDate.queryKey(),
    });
  };

  const proposeMutation = useMutation(
    trpc.protectedBlocks.proposeFromTemplates.mutationOptions({ onSuccess: invalidate })
  );
  const confirmMutation = useMutation(
    trpc.protectedBlocks.confirmProposedForWeek.mutationOptions({ onSuccess: invalidate })
  );

  if (templates.length === 0 && proposedCount === 0) return null;

  return (
    <div className="border-subtle mt-4 flex flex-wrap items-center gap-2 rounded-card border bg-surface px-3 py-2 text-sm">
      <span className="text-ink-muted">Protected time</span>
      {templates.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className="text-xs"
          disabled={proposeMutation.isPending}
          onClick={() => proposeMutation.mutate(weekInput)}
        >
          Apply default week
        </Button>
      ) : null}
      {proposedCount > 0 ? (
        <>
          <span className="text-xs text-ink-muted">
            {proposedCount} proposed block{proposedCount === 1 ? "" : "s"}
          </span>
          <Button
            type="button"
            className="text-xs"
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate(weekInput)}
          >
            Confirm
          </Button>
        </>
      ) : null}
    </div>
  );
}
