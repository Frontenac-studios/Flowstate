import type { GoalSteeringOffer } from "@/lib/planning/goal-journey";

export type GoalSteeringEvaluation = {
  shouldFire: boolean;
  offer: GoalSteeringOffer | null;
  message: string;
};

export function evaluateGoalSteering(input: {
  offer: GoalSteeringOffer | null;
  goalSteeringEnabled: boolean;
  alreadyNudgedToday: boolean;
  isOverCommitted: boolean;
}): GoalSteeringEvaluation {
  const noop: GoalSteeringEvaluation = {
    shouldFire: false,
    offer: null,
    message: "",
  };

  if (
    !input.goalSteeringEnabled ||
    !input.offer ||
    input.alreadyNudgedToday ||
    input.isOverCommitted
  ) {
    return noop;
  }

  return {
    shouldFire: true,
    offer: input.offer,
    message: `Next on ${input.offer.goalTitle}: ${input.offer.stepTitle}?`,
  };
}
