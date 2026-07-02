"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/kash/ui/Button";
import { useTRPC } from "@/trpc/client";

type Props = {
  projectId: string;
  projectName: string;
  onDismiss: () => void;
};

/** PR-5 tail: gentle template offer when a project completes (§9). */
export function ProjectTemplateSuggestChip({ projectId, projectName, onDismiss }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const saveTemplate = useMutation(
    trpc.projects.saveAsTemplate.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.listTemplates.queryKey() });
        onDismiss();
      },
    })
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-row border border-subtle bg-surface-2 px-3 py-2 text-caption text-ink-muted">
      <span>
        <span className="text-ink">{projectName}</span> looks reusable — save as a template?
      </span>
      <Button
        type="button"
        variant="ghost"
        className="text-caption"
        disabled={saveTemplate.isPending}
        onClick={() => saveTemplate.mutate({ projectId, name: projectName })}
      >
        Save template
      </Button>
      <Button type="button" variant="ghost" className="text-caption" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}
