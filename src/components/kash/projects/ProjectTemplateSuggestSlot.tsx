"use client";

import type { ReactNode } from "react";

import { useProjectTemplateSuggest } from "@/hooks/useProjectTemplateSuggest";
import type { ProjectCategory } from "@/lib/projects/categories";

import { ProjectSimilarityCompleteChip } from "./ProjectSimilarityCompleteChip";
import { ProjectTemplateSuggestChip } from "./ProjectTemplateSuggestChip";

type Props = {
  projectId: string;
  projectName: string;
  category: ProjectCategory;
  isComplete: boolean;
  children: ReactNode;
};

/** Renders children plus completion chips (template suggest + similarity) when done. */
export function ProjectTemplateSuggestSlot({
  projectId,
  projectName,
  category,
  isComplete,
  children,
}: Props) {
  const { showChip, dismiss } = useProjectTemplateSuggest(projectId, isComplete);

  return (
    <div className="flex flex-col gap-2">
      {children}
      {showChip ? (
        <ProjectTemplateSuggestChip
          projectId={projectId}
          projectName={projectName}
          onDismiss={dismiss}
        />
      ) : null}
      <ProjectSimilarityCompleteChip
        projectId={projectId}
        projectName={projectName}
        category={category}
        isComplete={isComplete}
      />
    </div>
  );
}
