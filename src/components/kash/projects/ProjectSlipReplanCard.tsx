"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { ConfirmActionCard } from "@/components/kash/chat/ConfirmActionCard";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import {
  dismissSlipReplan,
  isSlipReplanDismissed,
  slipReplanFingerprint,
} from "@/lib/projects/slip-replan-storage";
import { useTRPC } from "@/trpc/client";

type ReplanProposal = Extract<ProposedAction, { kind: "replan_project_dates" }>;

function phaseEndsFromProposal(proposal: ReplanProposal): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const item of proposal.items) {
    map[item.phaseId] = item.previousEndDate ?? null;
  }
  return map;
}

export function ProjectSlipReplanCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dismissedLocally, setDismissedLocally] = useState(false);

  const { data: proposal } = useQuery(
    trpc.projects.proposeSlipReplan.queryOptions({ projectId }, { staleTime: 30_000 })
  );

  const fingerprint = useMemo(() => {
    if (!proposal || proposal.kind !== "replan_project_dates") return null;
    return slipReplanFingerprint(projectId, phaseEndsFromProposal(proposal));
  }, [projectId, proposal]);

  const applyMutation = useMutation(
    trpc.projects.applySlipReplan.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.projects.proposeSlipReplan.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.phases.listByProject.queryKey() }),
        ]);
        if (fingerprint) dismissSlipReplan(fingerprint);
        setDismissedLocally(true);
      },
    })
  );

  const handleDismiss = useCallback(() => {
    if (fingerprint) dismissSlipReplan(fingerprint);
    setDismissedLocally(true);
  }, [fingerprint]);

  const handleConfirm = useCallback(
    (enabledItemIds: string[]) => {
      if (!proposal || proposal.kind !== "replan_project_dates") return;
      applyMutation.mutate({ projectId, proposal, enabledItemIds });
    },
    [applyMutation, projectId, proposal]
  );

  if (!proposal || proposal.kind !== "replan_project_dates") return null;
  if (dismissedLocally) return null;
  if (fingerprint && isSlipReplanDismissed(fingerprint)) return null;

  return (
    <ConfirmActionCard
      proposal={proposal}
      busy={applyMutation.isPending}
      onConfirm={handleConfirm}
      onDismiss={handleDismiss}
    />
  );
}
