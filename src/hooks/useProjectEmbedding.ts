"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { embedText } from "@/lib/tasks/embed-text";
import { useTRPC } from "@/trpc/client";

/**
 * Compute a project name's embedding in the browser (MiniLM / Backlog seam) and
 * store it via `projects.backfillEmbedding`. Best-effort — failures are swallowed.
 */
export function useProjectEmbedding(): (
  projectId: string,
  name: string,
  inferSimilar?: boolean
) => Promise<void> {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const backfill = useMutation(
    trpc.projects.backfillEmbedding.mutationOptions({
      onSuccess: (_result, variables) => {
        void queryClient.invalidateQueries({
          queryKey: trpc.projects.listSimilarityLinks.queryKey({
            projectId: variables.projectId,
          }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.projects.listSimilarCandidates.queryKey(),
        });
      },
    })
  );

  return useCallback(
    async (projectId: string, name: string, inferSimilar = true) => {
      try {
        const embedding = await embedText(name);
        if (embedding.length === 0) return;
        backfill.mutate({ projectId, embedding, inferSimilar });
      } catch {
        // Embedding is an enhancement; never block create/complete.
      }
    },
    [backfill]
  );
}
