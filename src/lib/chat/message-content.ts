import { z } from "zod";

import { proposedActionSchema } from "@/lib/chat/proposed-actions";

export const messageMetaSchema = z.object({
  source: z.literal("nudge").optional(),
  kind: z.enum(["top3_stall"]).optional(),
  proposal: proposedActionSchema.optional(),
});

export type MessageMeta = z.infer<typeof messageMetaSchema>;

export const messageContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  meta: messageMetaSchema.optional(),
});

export type MessageContent = z.infer<typeof messageContentSchema>;

export function textContent(text: string, meta?: MessageMeta): MessageContent {
  return meta ? { type: "text", text, meta } : { type: "text", text };
}

export function nudgeContent(text: string, kind: NonNullable<MessageMeta["kind"]>): MessageContent {
  return { type: "text", text, meta: { source: "nudge", kind } };
}

export function assistantContentWithProposal(
  text: string,
  proposal: z.infer<typeof proposedActionSchema>
): MessageContent {
  return { type: "text", text, meta: { proposal } };
}
