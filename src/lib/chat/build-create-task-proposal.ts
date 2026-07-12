import type { CaptureContext } from "@/lib/chat/capture-context";
import {
  newProposalItemId,
  type ProposedAction,
  proposedActionSchema,
} from "@/lib/chat/proposed-actions";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Raw `create_task` tool input as emitted by the model (loosely typed). */
export type CreateTaskToolInput = {
  tasks?: {
    title: string;
    scheduledDate?: string;
    projectSlug?: string;
    phaseId?: string | null;
    phaseName?: string;
    category?: string;
    tags?: string[];
    timeEstimateMinutes?: number;
    priority?: number;
    /** Local key within this proposal for Dep-B wiring. */
    tempId?: string;
    /** Other tempIds in this proposal that this task blocks. */
    blocksTempIds?: string[];
  }[];
  summary?: string;
};

function isCategory(value: string | undefined): value is ProjectCategory {
  return value != null && (PROJECT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Map a `create_task` tool call into a validated create_task proposal. Pure —
 * no DB access — so it stays unit-testable. A raw model `scheduledDate` is
 * demoted to `suggestedDate` (inbox-first contract); capture context supplies
 * project/phase/category defaults when the model omits them.
 *
 * Dep-B: `tempId` / `blocksTempIds` are remapped onto generated `itemId`s as
 * `blocksItemIds` so morning Begin can create dependency edges after insert.
 */
export function buildCreateTaskProposal(
  input: CreateTaskToolInput,
  captureContext?: CaptureContext | null
): { ok: true; proposal: ProposedAction } | { ok: false; error: string } {
  const rows = input.tasks?.filter((t) => t.title?.trim()) ?? [];
  if (rows.length === 0) return { ok: false, error: "tasks array is required" };

  const itemIds = rows.map(() => newProposalItemId());
  const tempToItemId = new Map<string, string>();
  rows.forEach((row, index) => {
    const tempId = row.tempId?.trim();
    if (tempId) tempToItemId.set(tempId, itemIds[index]!);
  });

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "create_task",
      status: "pending",
      summary: input.summary,
      items: rows.map((t, index) => {
        const blocksItemIds = (t.blocksTempIds ?? [])
          .map((temp) => tempToItemId.get(temp.trim()))
          .filter((id): id is string => id != null && id !== itemIds[index]);
        return {
          itemId: itemIds[index]!,
          enabled: true,
          title: t.title.trim(),
          suggestedDate: t.scheduledDate && ISO_DATE.test(t.scheduledDate) ? t.scheduledDate : null,
          scheduledDate: null,
          projectSlug: t.projectSlug ?? captureContext?.projectSlug ?? null,
          phaseId: t.phaseId !== undefined ? t.phaseId : captureContext?.phaseId,
          phaseName: t.phaseName ?? captureContext?.phaseName ?? null,
          category: t.category && isCategory(t.category) ? t.category : captureContext?.category,
          tags: t.tags,
          timeEstimateMinutes: t.timeEstimateMinutes,
          priority: t.priority,
          blocksItemIds: blocksItemIds.length > 0 ? blocksItemIds : undefined,
        };
      }),
    }),
  };
}
