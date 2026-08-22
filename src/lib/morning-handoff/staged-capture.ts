import type { ProjectCategory } from "@/lib/projects/categories";
import type { CreateTaskItemEdit } from "@/lib/chat/proposed-actions";

/** Client-only id prefix so staged rows never collide with real task UUIDs. */
export const STAGED_CAPTURE_PREFIX = "staged:";

export function isStagedCaptureId(id: string): boolean {
  return id.startsWith(STAGED_CAPTURE_PREFIX);
}

export function newStagedCaptureId(): string {
  return `${STAGED_CAPTURE_PREFIX}${crypto.randomUUID()}`;
}

/**
 * A create_task row accepted in morning triage but not yet written to Today.
 * Committed on Begin day; discarded on Skip.
 */
export type StagedCapture = {
  id: string;
  /** Proposal itemId from chat — used to map Dep-B edges across confirms. */
  sourceItemId: string;
  title: string;
  category: ProjectCategory | null;
  projectSlug: string | null;
  phaseId: string | null;
  priority: number;
  suggestedDate: string | null;
  /** Other staged/source itemIds this task blocks (Dep-B). */
  blocksItemIds: string[];
};

function uniqueIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids));
}

export function stagedCapturesFromEdits(
  edits: readonly CreateTaskItemEdit[],
  blocksByItemId: ReadonlyMap<string, string[]> = new Map()
): StagedCapture[] {
  return edits.map((edit) => ({
    id: newStagedCaptureId(),
    sourceItemId: edit.itemId,
    title: edit.title.trim(),
    category: edit.category ?? null,
    projectSlug: edit.projectSlug ?? null,
    phaseId: edit.phaseId ?? null,
    priority: edit.priority ?? 0,
    suggestedDate: edit.suggestedDate ?? null,
    blocksItemIds: uniqueIds([
      ...(edit.blocksItemIds ?? []),
      ...(blocksByItemId.get(edit.itemId) ?? []),
    ]),
  }));
}
