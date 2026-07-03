"use client";

import type { ReactNode } from "react";

import { useProjectTemplateSuggest } from "@/hooks/useProjectTemplateSuggest";

import { ProjectTemplateSuggestChip } from "./ProjectTemplateSuggestChip";

type Props = {
  projectId: string;
  projectName: string;
  isComplete: boolean;
  children: ReactNode;
};

/** Renders children plus the template-suggest chip when the project completes (§5 P3). */
export function ProjectTemplateSuggestSlot({
  projectId,
  projectName,
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
    </div>
  );
}
