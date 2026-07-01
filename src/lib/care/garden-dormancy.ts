/** Days without garden nourishment before the stand-in scene softens to dormancy. */
export const GARDEN_DORMANCY_DAYS = 7;

export type GardenLifeState = "active" | "dormant" | "reviving";

export type GardenDormancyInput = {
  lastActiveAt: Date | null;
  now?: Date;
};

/** Derive garden life state from the most recent nourishment timestamp. */
export function gardenLifeState({
  lastActiveAt,
  now = new Date(),
}: GardenDormancyInput): GardenLifeState {
  if (!lastActiveAt) return "active";

  const msSinceActive = now.getTime() - lastActiveAt.getTime();
  const dormancyMs = GARDEN_DORMANCY_DAYS * 86_400_000;

  if (msSinceActive <= dormancyMs) return "active";

  const daysSinceActive = msSinceActive / 86_400_000;
  const daysPastThreshold = daysSinceActive - GARDEN_DORMANCY_DAYS;

  if (daysPastThreshold <= 1) return "reviving";

  return "dormant";
}
