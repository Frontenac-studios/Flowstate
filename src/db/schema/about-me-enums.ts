import { pgEnum } from "drizzle-orm/pg-core";

/** The four headed sections of the "About me" doc (§13 V2-5). */
export const aboutMeSection = pgEnum("about_me_section", ["values", "work", "life", "constraints"]);

/** How a value entered the set: a curated suggestion vs the user's own (V1-2 hybrid). */
export const valueSource = pgEnum("value_source", ["curated", "custom"]);

/** Structured-constraint kind (V3-1). */
export const constraintType = pgEnum("constraint_type", ["hours", "commitment", "preference"]);

/** Two tiers (V3-2): hard = never scheduled over; soft = avoided when possible. */
export const constraintSeverity = pgEnum("constraint_severity", ["hard", "soft"]);

/** Who authored a piece of doc content — the user, or AI-proposed (V2-2). */
export const aboutMeAuthor = pgEnum("about_me_author", ["user", "ai"]);

/** Ghosted-proposal lifecycle, mirroring planning_suggestions (§9 GA-4). */
export const aboutMeSuggestionStatus = pgEnum("about_me_suggestion_status", [
  "pending",
  "staged",
  "applied",
  "dismissed",
]);
