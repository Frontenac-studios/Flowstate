import { z } from "zod";

export const top3SlotStatusSchema = z.object({
  order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.enum(["empty", "done", "incomplete"]),
  taskId: z.string().uuid().optional(),
  title: z.string().optional(),
});

export const top3StatusSchema = z.object({
  slots: z.array(top3SlotStatusSchema).length(3),
});

export type Top3SlotStatus = z.infer<typeof top3SlotStatusSchema>;
export type Top3Status = z.infer<typeof top3StatusSchema>;

export type EodFocusBar = {
  taskId: string;
  title: string;
  seconds: number;
};

export type EodUiState = "hidden" | "banner" | "modal";

export type Top3SlotInput = {
  id: string;
  title: string;
  top3Order: number | null;
  completedAt: Date | null;
};

export type TimeEntryFocusInput = {
  taskId: string;
  startedAt: Date;
  endedAt: Date | null;
};
