import { z } from "zod";

import { PROJECT_CATEGORIES } from "@/lib/projects/categories";

export const proposalStatusSchema = z.enum(["pending", "applied", "dismissed"]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const categorySchema = z.enum(PROJECT_CATEGORIES);
const top3SlotSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const prioritySlotSchema = top3SlotSchema;

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
  // A chat-created task lands in the inbox unscheduled; the proposed day is a
  // suggestion the user commits later via Accept/drag. `scheduledDate` is kept
  // for back-compat but is null on the current create path.
  suggestedDate: isoDateSchema.nullable().optional(),
  scheduledDate: isoDateSchema.nullable().optional(),
  projectSlug: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
});

export const completeTaskProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
});

export const editTaskProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
  nextTitle: z.string().min(1).max(500).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  category: categorySchema.optional(),
  scheduledDate: isoDateSchema.nullable().optional(),
  projectSlug: z.string().nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
});

export const deleteTaskProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
});

export const setTop3ProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
  slot: top3SlotSchema,
});

export const setProtectedBlockProposalItemSchema = proposalItemBaseSchema.extend({
  category: categorySchema,
  scheduledDate: isoDateSchema,
  label: z.string().max(200).nullable().optional(),
  startMin: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 - 1)
    .nullable()
    .optional(),
  endMin: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .nullable()
    .optional(),
  status: z.enum(["proposed", "confirmed"]).default("confirmed"),
});

export const setDayPrioritiesProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
  scheduledDate: isoDateSchema,
  slot: prioritySlotSchema,
});

export const applyBalanceSuggestionsProposalItemSchema = proposalItemBaseSchema.extend({
  category: categorySchema,
  taskTitle: z.string().min(1).max(500),
  taskId: z.string().uuid().nullable().optional(),
  scheduledDate: isoDateSchema.nullable().optional(),
});

export const createProjectProposalItemSchema = proposalItemBaseSchema.extend({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).optional(),
  category: categorySchema,
});

export const editPhaseProposalItemSchema = proposalItemBaseSchema.extend({
  phaseId: z.string().uuid(),
  phaseName: z.string().min(1),
  projectSlug: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  startDate: isoDateSchema.nullable().optional(),
  endDate: isoDateSchema.nullable().optional(),
});

export const moveTaskToPhaseProposalItemSchema = proposalItemBaseSchema.extend({
  taskId: z.string().uuid(),
  title: z.string().min(1),
  phaseId: z.string().uuid().nullable(),
  phaseName: z.string().nullable().optional(),
  projectSlug: z.string().nullable().optional(),
});

export const replanProjectDatesProposalItemSchema = proposalItemBaseSchema.extend({
  phaseId: z.string().uuid(),
  phaseName: z.string().min(1),
  projectSlug: z.string().min(1).optional(),
  startDate: isoDateSchema.nullable().optional(),
  endDate: isoDateSchema.nullable().optional(),
  previousStartDate: isoDateSchema.nullable().optional(),
  previousEndDate: isoDateSchema.nullable().optional(),
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

export const editTaskProposalSchema = z.object({
  kind: z.literal("edit_task"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(editTaskProposalItemSchema).min(1),
});

export const deleteTaskProposalSchema = z.object({
  kind: z.literal("delete_task"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(deleteTaskProposalItemSchema).min(1),
});

export const setTop3ProposalSchema = z.object({
  kind: z.literal("set_top3"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(setTop3ProposalItemSchema).min(1),
});

export const setProtectedBlockProposalSchema = z.object({
  kind: z.literal("set_protected_block"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(setProtectedBlockProposalItemSchema).min(1),
});

export const setDayPrioritiesProposalSchema = z.object({
  kind: z.literal("set_day_priorities"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(setDayPrioritiesProposalItemSchema).min(1),
});

export const applyBalanceSuggestionsProposalSchema = z.object({
  kind: z.literal("apply_balance_suggestions"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(applyBalanceSuggestionsProposalItemSchema).min(1),
});

export const createProjectProposalSchema = z.object({
  kind: z.literal("create_project"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(createProjectProposalItemSchema).min(1),
});

export const editPhaseProposalSchema = z.object({
  kind: z.literal("edit_phase"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(editPhaseProposalItemSchema).min(1),
});

export const moveTaskToPhaseProposalSchema = z.object({
  kind: z.literal("move_task_to_phase"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(moveTaskToPhaseProposalItemSchema).min(1),
});

export const replanProjectDatesProposalSchema = z.object({
  kind: z.literal("replan_project_dates"),
  status: proposalStatusSchema.default("pending"),
  summary: z.string().optional(),
  items: z.array(replanProjectDatesProposalItemSchema).min(1),
});

export const proposedActionSchema = z.discriminatedUnion("kind", [
  rescheduleTasksProposalSchema,
  createTaskProposalSchema,
  completeTaskProposalSchema,
  editTaskProposalSchema,
  deleteTaskProposalSchema,
  setTop3ProposalSchema,
  setProtectedBlockProposalSchema,
  setDayPrioritiesProposalSchema,
  applyBalanceSuggestionsProposalSchema,
  createProjectProposalSchema,
  editPhaseProposalSchema,
  moveTaskToPhaseProposalSchema,
  replanProjectDatesProposalSchema,
]);

export type ProposedAction = z.infer<typeof proposedActionSchema>;

export function newProposalItemId(): string {
  return crypto.randomUUID();
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
  const count = action.items.length;
  const plural = count === 1 ? "" : "s";
  switch (action.kind) {
    case "reschedule_tasks": {
      const dates = Array.from(new Set(action.items.map((i) => i.scheduledDate)));
      const datePart = dates.length === 1 ? dates[0] : "new dates";
      return `Reschedule ${count} task${plural} → ${datePart}`;
    }
    case "create_task":
      return `Create ${count} task${plural}`;
    case "complete_task":
      return `Complete ${count} task${plural}`;
    case "edit_task":
      return `Edit ${count} task${plural}`;
    case "delete_task":
      return `Delete ${count} task${plural}`;
    case "set_top3":
      return `Set Top 3 (${count} slot${plural})`;
    case "set_protected_block":
      return `Add ${count} protected block${plural}`;
    case "set_day_priorities":
      return `Set ${count} day priorit${count === 1 ? "y" : "ies"}`;
    case "apply_balance_suggestions":
      return `Apply ${count} balance suggestion${plural}`;
    case "create_project":
      return `Create ${count} project${plural}`;
    case "edit_phase":
      return `Edit ${count} phase${plural}`;
    case "move_task_to_phase":
      return `Move ${count} task${plural} to phase`;
    case "replan_project_dates":
      return `Replan dates for ${count} phase${plural}`;
    default:
      return "Confirm changes";
  }
}
