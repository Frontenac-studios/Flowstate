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
 */
export function buildCreateTaskProposal(
  input: CreateTaskToolInput,
  captureContext?: CaptureContext | null
): { ok: true; proposal: ProposedAction } | { ok: false; error: string } {
  const rows = input.tasks?.filter((t) => t.title?.trim()) ?? [];
  if (rows.length === 0) return { ok: false, error: "tasks array is required" };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "create_task",
      status: "pending",
      summary: input.summary,
      items: rows.map((t) => ({
        itemId: newProposalItemId(),
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
      })),
    }),
  };
}
