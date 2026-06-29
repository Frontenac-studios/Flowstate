// Local copies of the Care enum value tuples (CL1 — src/db/schema/care-enums.ts).
//
// src/lib/care is a framework-free zone: it must NOT import care-enums.ts, which
// pulls in drizzle-orm. We mirror the literal tuples here so the seed catalog and
// cadence util stay pure. A Vitest drift guard (seed-catalog.test.ts) asserts these
// tuples are identical to the schema's, so the two definitions can never diverge.

/** Thematic grouping of practices, "by need" (D3/D4). */
export const CARE_THEMES = ["move", "calm", "connect", "rest", "nourish", "reflect"] as const;
export type CareTheme = (typeof CARE_THEMES)[number];

/** Forward-compat hint for breathing/walk/reflect deep-links (nullable on the row). */
export const CARE_KINDS = ["walk", "breathe", "reflect", "custom"] as const;
export type CareKind = (typeof CARE_KINDS)[number];

/** Optional intended rhythm; pre-fills the repeat rule on "Add to my day" (D6). */
export const CARE_CADENCES = ["daily", "most_days", "weekly", "when_needed"] as const;
export type CareCadence = (typeof CARE_CADENCES)[number];

/** A single static seed-catalog entry (suggested practice). */
export type SeedPractice = {
  /** Stable catalog_key — used by Adopt to de-dupe and to hide adopted seeds. Never change. */
  key: string;
  title: string;
  theme: CareTheme;
  /** Deep-link hint; omitted unless the practice is clearly a walk/breathe/reflect. */
  kind?: CareKind;
  /** Intended rhythm; pre-fills scheduling on adopt. Omitted = one-off default. */
  cadence?: CareCadence;
};
