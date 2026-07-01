export const essentialNudgeKinds = ["top3_stall", "self_care_walk", "monthly_review"] as const;
export type EssentialNudgeKind = (typeof essentialNudgeKinds)[number];

export type EssentialNudgeChipPayload = {
  kind: EssentialNudgeKind;
  message: string;
};
