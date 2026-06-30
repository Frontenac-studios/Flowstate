import { z } from "zod";

// Enum schemas — mirror the pg/sqlite enums in the schema layer (§13 data model).
export const aboutMeSectionSchema = z.enum(["values", "work", "life", "constraints"]);
export type AboutMeSection = z.infer<typeof aboutMeSectionSchema>;

export const valueSourceSchema = z.enum(["curated", "custom"]);
export type ValueSource = z.infer<typeof valueSourceSchema>;

export const constraintTypeSchema = z.enum(["hours", "commitment", "preference"]);
export type ConstraintType = z.infer<typeof constraintTypeSchema>;

export const constraintSeveritySchema = z.enum(["hard", "soft"]);
export type ConstraintSeverity = z.infer<typeof constraintSeveritySchema>;

export const aboutMeAuthorSchema = z.enum(["user", "ai"]);
export type AboutMeAuthor = z.infer<typeof aboutMeAuthorSchema>;

export const aboutMeSuggestionStatusSchema = z.enum(["pending", "staged", "applied", "dismissed"]);
export type AboutMeSuggestionStatus = z.infer<typeof aboutMeSuggestionStatusSchema>;

// V1-3: a "core values" set of 3–7. The max is a hard ceiling enforced on add; the min
// is a soft floor the UI nudges toward (a user mid-setup legitimately has fewer than 3).
export const VALUES_MIN = 3;
export const VALUES_MAX = 7;
export const VALUE_LABEL_MAX = 40;

// Generous prose cap — guards storage without getting in the user's way.
export const SECTION_BODY_MAX = 4000;

// Free-prose body for a headed section (Work / Life). Empty is allowed (cleared section).
export const proseBodySchema = z.string().max(SECTION_BODY_MAX);

// Order of the headed sections in the one scrolling doc + anchor chips.
export const ABOUT_ME_SECTION_ORDER = ["values", "work", "life", "constraints"] as const;

// Curated suggestions that spark the hybrid picker (V1-2). Not exhaustive — the user can
// always write their own. Order is intentional (broad life-areas first).
export const CURATED_VALUES = [
  "Health",
  "Family",
  "Craft",
  "Learning",
  "Adventure",
  "Creativity",
  "Connection",
  "Growth",
  "Stability",
  "Freedom",
  "Honesty",
  "Generosity",
  "Balance",
  "Curiosity",
  "Discipline",
  "Kindness",
  "Impact",
  "Play",
] as const;
