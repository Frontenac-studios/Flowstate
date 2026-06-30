import { z } from "zod";

import {
  type AboutMeSection,
  constraintSeveritySchema,
  constraintTypeSchema,
  SECTION_BODY_MAX,
} from "./constants";
import { constraintScheduleSchema } from "./constraints";
import { valueLabelSchema } from "./values";

// The shape of an AI-proposed addition (about_me_suggestions.payload), keyed by the
// suggestion's target section. §11 produces these; this section consumes/accepts them.
export const valueSuggestionPayloadSchema = z.object({ label: valueLabelSchema });

export const proseSuggestionPayloadSchema = z.object({
  text: z.string().trim().min(1).max(SECTION_BODY_MAX),
});

export const constraintSuggestionPayloadSchema = z.object({
  type: constraintTypeSchema,
  label: z.string().trim().min(1),
  schedule: constraintScheduleSchema.nullish(),
  severity: constraintSeveritySchema,
});

export type ValueSuggestionPayload = z.infer<typeof valueSuggestionPayloadSchema>;
export type ProseSuggestionPayload = z.infer<typeof proseSuggestionPayloadSchema>;
export type ConstraintSuggestionPayload = z.infer<typeof constraintSuggestionPayloadSchema>;

/** Pick the payload schema that matches a suggestion's target section. */
export function suggestionPayloadSchema(section: AboutMeSection) {
  switch (section) {
    case "values":
      return valueSuggestionPayloadSchema;
    case "constraints":
      return constraintSuggestionPayloadSchema;
    case "work":
    case "life":
      return proseSuggestionPayloadSchema;
  }
}

/** Validate an unknown payload against its target section; throws on mismatch. */
export function parseSuggestionPayload(section: AboutMeSection, payload: unknown) {
  return suggestionPayloadSchema(section).parse(payload);
}
