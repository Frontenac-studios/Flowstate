import type { ProjectCategory } from "@/lib/projects/categories";

export const essentialNudgeKinds = [
  "top3_stall",
  "self_care_walk",
  "self_care_walk_1",
  "self_care_walk_2",
  "self_care_walk_3",
  "self_care_breathe_stress",
  "self_care_lifts_me",
  "monthly_review",
  "balance_lopsided",
  "goal_step",
  "top3_slip",
  "evidence_surface",
] as const;
export type EssentialNudgeKind = (typeof essentialNudgeKinds)[number];

export type EssentialNudgeClass = "reassurance" | "problem";

export type EssentialNudgeChipPayload = {
  kind: EssentialNudgeKind;
  message: string;
  klass: EssentialNudgeClass;
  priority: number;
  action?: { type: string; payload?: string };
  categoryTint?: ProjectCategory;
};
