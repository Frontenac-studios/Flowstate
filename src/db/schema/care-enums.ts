import { pgEnum } from "drizzle-orm/pg-core";

// Self-care library enums (Care Tasks tab — CL1). Each value tuple is exported
// alongside its pgEnum so Zod input schemas (CL2/CL3) can reuse the literals.

/** Thematic grouping of practices, "by need" (D3/D4). */
export const CARE_THEMES = ["move", "calm", "connect", "rest", "nourish", "reflect"] as const;
export const careTheme = pgEnum("care_theme", CARE_THEMES);

/** Forward-compat hint for breathing/walk deep-links (nullable on the row). */
export const CARE_KINDS = ["walk", "breathe", "reflect", "custom"] as const;
export const careKind = pgEnum("care_kind", CARE_KINDS);

/** Optional intended rhythm; pre-fills the repeat rule on "Add to my day" (D6). */
export const CARE_CADENCES = ["daily", "most_days", "weekly", "when_needed"] as const;
export const careCadence = pgEnum("care_cadence", CARE_CADENCES);

/** Whether a practice came from the seed catalog or was user-created. */
export const CARE_SOURCES = ["suggested", "custom"] as const;
export const careSource = pgEnum("care_source", CARE_SOURCES);
