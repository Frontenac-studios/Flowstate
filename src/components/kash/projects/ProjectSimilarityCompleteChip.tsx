"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { useProjectEmbedding } from "@/hooks/useProjectEmbedding";
import type { ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import { ProjectSimilarityPicker } from "./ProjectSimilarityPicker";

type Props = {
  projectId: string;
  projectName: string;
  category: ProjectCategory;
  isComplete: boolean;
};

/**
 * On project complete: offer "Like this past one" tagging and run MiniLM inference.
 */
export function ProjectSimilarityCompleteChip({
  projectId,
  projectName,
  category,
  isComplete,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const backfillEmbedding = useProjectEmbedding();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [wasComplete, setWasComplete] = useState(isComplete);
  /** Only offer on the completion transition — not for pre-existing completed projects. */
  const [offerTag, setOfferTag] = useState(false);

  const { data: links = [] } = useQuery({
    ...trpc.projects.listSimilarityLinks.queryOptions({ projectId }),
    enabled: isComplete && offerTag,
  });

  const tagMutation = useMutation(
    trpc.projects.tagSimilar.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.projects.listSimilarityLinks.queryKey({ projectId }),
        });
        setDismissed(true);
      },
    })
  );

  useEffect(() => {
    if (isComplete && !wasComplete) {
      setOfferTag(true);
      void backfillEmbedding(projectId, projectName, true);
    }
    setWasComplete(isComplete);
  }, [isComplete, wasComplete, backfillEmbedding, projectId, projectName]);

  const hasUserTag = links.some((link) => link.source === "user");
  if (!offerTag || dismissed || hasUserTag) return null;

  const inferredNames = links
    .filter((link) => link.source === "inferred")
    .map((link) => link.similarName);

  return (
    <div className="flex flex-col gap-2 rounded-row border border-subtle bg-surface-2 px-3 py-2">
      <p className="text-caption text-ink-muted">
        Tag a past project this was like — helps templates and duration learning.
        {inferredNames.length > 0 ? (
          <span className="mt-0.5 block text-ink">
            Suggested: {inferredNames.slice(0, 2).join(", ")}
          </span>
        ) : null}
      </p>

      <ProjectSimilarityPicker
        liveName={projectName}
        excludeProjectId={projectId}
        preferredCategory={category}
        selectedId={selectedId}
        onSelect={setSelectedId}
        compact
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="text-caption"
          disabled={!selectedId || tagMutation.isPending}
          onClick={() => {
            if (!selectedId) return;
            tagMutation.mutate({ projectId, similarProjectId: selectedId });
          }}
        >
          Save tag
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-caption"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
