import type { GardenLifeState } from "./garden-dormancy";

/** Functional growth tiers from total garden nourishment events (no art rules yet). */
export function gardenGrowthTier(nourishCount: number): number {
  if (nourishCount <= 0) return 0;
  if (nourishCount <= 2) return 1;
  if (nourishCount <= 5) return 2;
  return 3;
}

/** Extra plant markers to render in the stand-in garden scene (capped for layout). */
export function extraPlantCount(nourishCount: number): number {
  return Math.min(Math.max(nourishCount, 0), 5);
}

/** Human-readable growth copy for the garden footer (tier + dormancy life state). */
export function gardenGrowthStageLabel(growthTier: number, lifeState: GardenLifeState): string {
  if (lifeState === "dormant") return "Resting gently";
  if (lifeState === "reviving") return "Waking back up";
  if (growthTier <= 0) return "Just sprouting";
  if (growthTier === 1) return "Finding its rhythm";
  if (growthTier === 2) return "Growing steadily";
  return "In full bloom";
}
