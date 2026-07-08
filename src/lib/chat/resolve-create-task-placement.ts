import type { CaptureContext } from "@/lib/chat/capture-context";
import type { CreateTaskItemEdit } from "@/lib/chat/proposed-actions";
import { categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { findPhaseByName, type PhaseRef } from "@/lib/projects/find-phase-by-name";

export type CreateTaskPlacementSource = {
  projectSlug?: string | null;
  phaseId?: string | null;
  phaseName?: string | null;
  category?: ProjectCategory;
};

export type ResolvedCreateTaskPlacement = {
  projectSlug: string | null;
  phaseId: string | null;
  phaseName: string | null;
  category: ProjectCategory | null;
};

/** Merge proposal item, optional confirm edit, and capture context (lowest precedence). */
export function mergeCreateTaskPlacementSources(
  proposal: CreateTaskPlacementSource,
  edit?: Pick<CreateTaskItemEdit, "projectSlug" | "phaseId" | "phaseName" | "category">,
  captureContext?: CaptureContext | null
): ResolvedCreateTaskPlacement {
  const pick = <T>(
    editVal: T | undefined,
    proposalVal: T | undefined,
    captureVal: T | undefined
  ) =>
    editVal !== undefined
      ? editVal
      : proposalVal !== undefined
        ? proposalVal
        : (captureVal ?? null);

  return {
    projectSlug: pick(edit?.projectSlug, proposal.projectSlug, captureContext?.projectSlug ?? null),
    phaseId: pick(edit?.phaseId, proposal.phaseId, captureContext?.phaseId),
    phaseName: pick(edit?.phaseName, proposal.phaseName, captureContext?.phaseName ?? null),
    category: pick(edit?.category, proposal.category, captureContext?.category),
  };
}

export function resolvePhaseIdForProject(
  phases: PhaseRef[],
  phaseId: string | null | undefined,
  phaseName: string | null | undefined
): string | null {
  if (phaseId) return phaseId;
  if (phaseId === null) return null;
  if (!phaseName?.trim()) return null;

  const match = findPhaseByName(phases, phaseName);
  return match.kind === "found" ? match.phaseId : null;
}

export type CreateTaskCategoryInput = {
  explicit: ProjectCategory | null;
  projectCategory: ProjectCategory | null;
  captureContextCategory: ProjectCategory | null;
};

/** Category ladder for chat create: explicit > project > capture context. */
export function resolveCreateTaskCategory(input: CreateTaskCategoryInput): ProjectCategory | null {
  if (input.explicit) return input.explicit;
  if (input.projectCategory) return input.projectCategory;
  if (input.captureContextCategory) return input.captureContextCategory;
  return null;
}

export type PlacementSummaryInput = {
  category: ProjectCategory | null;
  categoryUnresolved?: boolean;
  projectName: string | null;
  phaseName: string | null;
  landing?: "inbox" | "today";
};

/** Human-readable placement line for the confirm card. */
export function formatCreateTaskPlacementSummary(input: PlacementSummaryInput): string {
  const parts: string[] = [];
  if (input.category && !input.categoryUnresolved) {
    parts.push(categoryLabel(input.category));
  } else {
    parts.push("no category");
  }
  parts.push(input.projectName ?? "no project");
  if (input.projectName) {
    parts.push(input.phaseName ?? "project loose");
  }
  parts.push(input.landing ?? "inbox");
  return parts.join(" · ");
}
