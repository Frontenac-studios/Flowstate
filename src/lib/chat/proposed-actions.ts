import { randomUUID } from "node:crypto";

import { z } from "zod";

export const proposalStatusSchema = z.enum(["pending", "applied", "dismissed"]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const proposalItemBaseSchema = z.object({
  itemId: z.string().min(1),
  enabled: z.boolean().default(true),
});

export const rescheduleProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
  scheduledDate: isoDateSchema,
  previousScheduledDate: isoDateSchema.nullable().optional(),
});

export const createTaskProposalItemSchema = proposalItemBaseSchema.extend({
  title: z.string().min(1).max(500),
  scheduledDate: isoDateSchema.nullable().optional(),
  projectSlug: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
});

export const completeTaskProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
});

export const rescheduleTasksProposalSchema = z.object({
  kind: z.literal("reschedule_tasks"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(rescheduleProposalItemSchema).min(1),
});

export const createTaskProposalSchema = z.object({
  kind: z.literal("create_task"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(createTaskProposalItemSchema).min(1),
});

export const completeTaskProposalSchema = z.object({
  kind: z.literal("complete_task"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(completeTaskProposalItemSchema).min(1),
});

export const proposedActionSchema = z.discriminatedUnion("kind", [
  rescheduleTasksProposalSchema,
  createTaskProposalSchema,
  completeTaskProposalSchema,
]);

export type ProposedAction = z.infer<typeof proposedActionSchema>;

export function newProposalItemId(): string {
  return randomUUID();
}

export function filterPayloadByEnabledItems(action: ProposedAction): ProposedAction | null {
  const items = action.items.filter((item) => item.enabled);
  if (items.length === 0) return null;
  return { ...action, items } as ProposedAction;
}

export function filterPayloadByItemIds(
  action: ProposedAction,
  enabledItemIds: readonly string[]
): ProposedAction | null {
  const allowed = new Set(enabledItemIds);
  const items = action.items.filter((item) => allowed.has(item.itemId));
  if (items.length === 0) return null;
  return { ...action, items: items.map((item) => ({ ...item, enabled: true })) } as ProposedAction;
}

export function proposalHeadline(action: ProposedAction): string {
  if (action.summary?.trim()) return action.summary.trim();
  switch (action.kind) {
    case "reschedule_tasks": {
      const dates = Array.from(new Set(action.items.map((i) => i.scheduledDate)));
      const datePart = dates.length === 1 ? dates[0] : "new dates";
      return `Reschedule ${action.items.length} task${action.items.length === 1 ? "" : "s"} → ${datePart}`;
    }
    case "create_task":
      return `Create ${action.items.length} task${action.items.length === 1 ? "" : "s"}`;
    case "complete_task":
      return `Complete ${action.items.length} task${action.items.length === 1 ? "" : "s"}`;
    default:
      return "Confirm changes";
  }
}
