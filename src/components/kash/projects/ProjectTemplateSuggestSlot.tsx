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
  showTemplateFeatures?: boolean;
  children: ReactNode;
};

/** Renders children plus completion chips (template suggest + similarity) when done. */
export function ProjectTemplateSuggestSlot({
  projectId,
  projectName,
  category,
  isComplete,
  showTemplateFeatures = true,
  children,
}: Props) {
  const { showChip, dismiss } = useProjectTemplateSuggest(
    projectId,
    isComplete,
    showTemplateFeatures
  );

  return (
    <div className="flex flex-col gap-2">
      {children}
      {showTemplateFeatures && showChip ? (
        <ProjectTemplateSuggestChip
          projectId={projectId}
          projectName={projectName}
          onDismiss={dismiss}
        />
      ) : null}
      {showTemplateFeatures ? (
        <ProjectSimilarityCompleteChip
          projectId={projectId}
          projectName={projectName}
          category={category}
          isComplete={isComplete}
        />
      ) : null}
    </div>
  );
}
