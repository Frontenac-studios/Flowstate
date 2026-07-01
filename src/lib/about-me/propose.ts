import { z } from "zod";
import { aboutMeSectionSchema } from "./constants";
export const aboutMeEditProposalSchema = z.object({
  targetSection: aboutMeSectionSchema,
  payload: z.unknown(),
  sourceText: z.string().trim().min(1).max(500),
  learnedAt: z.coerce.date().optional(),
});
export type AboutMeEditProposal = z.infer<typeof aboutMeEditProposalSchema>;
export function aboutMeSuggestionPayloadKey(
  section: AboutMeEditProposal["targetSection"],
  payload: unknown
): string {
  return `${section}:${JSON.stringify(payload)}`;
}
