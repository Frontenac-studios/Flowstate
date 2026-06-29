"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { embedText } from "@/lib/tasks/embed-text";
import { useTRPC } from "@/trpc/client";

/**
 * Compute a title's embedding in the browser (the model never runs server-side — §7A)
 * and store it via `abyss.backfillEmbedding`. Best-effort: failures are swallowed so a
 * cold model download never blocks capture. `checkDuplicates` should be true for a fresh
 * capture (so near-duplicates resurface) and false for quiet backfill of legacy rows.
 */
export function useAbyssEmbedding(): (
  id: string,
  title: string,
  checkDuplicates: boolean
) => Promise<void> {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const backfill = useMutation(
    trpc.abyss.backfillEmbedding.mutationOptions({
      onSuccess: (result) => {
        // A near-duplicate bump changed other rows' brightness — refresh the List.
        if (result.duplicatesBumped.length > 0) {
          void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
        }
      },
    })
  );

  return useCallback(
    async (id: string, title: string, checkDuplicates: boolean) => {
      try {
        const embedding = await embedText(title);
        if (embedding.length === 0) return;
        backfill.mutate({ id, embedding, checkDuplicates });
      } catch {
        // Embedding is an enhancement, not a requirement; skip silently on failure.
      }
    },
    [backfill]
  );
}
