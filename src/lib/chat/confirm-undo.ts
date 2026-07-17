import { z } from "zod";

import { PROJECT_CATEGORIES } from "@/lib/projects/categories";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const categorySchema = z.enum(PROJECT_CATEGORIES);

export const confirmUndoFrameSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("complete"),
    taskId: z.string().uuid(),
    previousCompletedAt: z.string().datetime().nullable(),
  }),
  z.object({
    type: z.literal("delete"),
    snapshot: z.object({
      id: z.string().uuid(),
      title: z.string(),
      priority: z.number().int(),
      scheduledDate: z.string().nullable(),
      bucketOverride: z.string().nullable(),
      projectId: z.string().uuid().nullable(),
      isTop3: z.boolean(),
      top3Order: z.number().int().nullable(),
      category: categorySchema,
      categoryUnresolved: z.boolean(),
      tags: z.array(z.string()).optional(),
    }),
  }),
  z.object({
    type: z.literal("edit_task"),
    taskId: z.string().uuid(),
    previous: z.object({
      title: z.string(),
      priority: z.number().int(),
      scheduledDate: z.string().nullable(),
      bucketOverride: z.string().nullable(),
      projectId: z.string().uuid().nullable(),
      phaseId: z.string().uuid().nullable(),
      category: categorySchema,
      categoryUnresolved: z.boolean(),
    }),
  }),
  z.object({
    type: z.literal("reschedule"),
    assignments: z.array(
      z.object({
        taskId: z.string().uuid(),
        previousScheduledDate: z.string().nullable(),
        previousBucketOverride: z.string().nullable(),
      })
    ),
  }),
  z.object({
    type: z.literal("create_tasks"),
    taskIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("set_top3"),
    slots: z.array(
      z.object({
        taskId: z.string().uuid(),
        previousIsTop3: z.boolean(),
        previousTop3Order: z.number().int().nullable(),
        previousScheduledDate: z.string().nullable(),
        previousBucketOverride: z.string().nullable(),
      })
    ),
  }),
  z.object({
    type: z.literal("create_protected_blocks"),
    blockIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("set_day_priorities"),
    rows: z.array(
      z.object({
        id: z.string().uuid(),
        taskId: z.string().uuid(),
        scheduledDate: isoDateSchema,
        previousPriorityOrder: z.number().int().nullable(),
      })
    ),
  }),
  z.object({
    type: z.literal("create_projects"),
    projectIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("create_phases"),
    phaseIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("create_goals"),
    goalIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("edit_phase"),
    phaseId: z.string().uuid(),
    previous: z.object({
      name: z.string(),
      description: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
    }),
  }),
  z.object({
    type: z.literal("move_task_to_phase"),
    taskId: z.string().uuid(),
    previousPhaseId: z.string().uuid().nullable(),
    previousProjectId: z.string().uuid().nullable(),
  }),
  z.object({
    type: z.literal("replan_project_dates"),
    phases: z.array(
      z.object({
        phaseId: z.string().uuid(),
        previousStartDate: z.string().nullable(),
        previousEndDate: z.string().nullable(),
      })
    ),
  }),
]);

export type ConfirmUndoFrame = z.infer<typeof confirmUndoFrameSchema>;
