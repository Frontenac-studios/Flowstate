export const essentialNudgeKinds = [
  "top3_stall",
  "self_care_walk",
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
};
