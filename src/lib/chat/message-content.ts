import { z } from "zod";

export const messageMetaSchema = z.object({
  source: z.literal("nudge"),
  kind: z.enum(["top3_stall"]),
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

export function nudgeContent(text: string, kind: MessageMeta["kind"]): MessageContent {
  return { type: "text", text, meta: { source: "nudge", kind } };
}
