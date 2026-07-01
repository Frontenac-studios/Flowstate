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
