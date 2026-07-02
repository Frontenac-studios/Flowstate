/** Six garden theme species — soft-flat seed and grown SVG keys (AN-C3). */
export const GARDEN_THEME_SPECIES = ["sprout", "fern", "bloom", "vine", "herb", "tree"] as const;

export type GardenThemeSpecies = (typeof GARDEN_THEME_SPECIES)[number];

export function gardenSpeciesForTier(tier: number): GardenThemeSpecies {
  return GARDEN_THEME_SPECIES[Math.min(tier, GARDEN_THEME_SPECIES.length - 1)] ?? "sprout";
}

export function isGardenGrownStage(tier: number): boolean {
  return tier >= 2;
}
