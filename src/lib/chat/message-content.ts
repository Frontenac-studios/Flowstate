import { z } from "zod";

export const messageContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export type MessageContent = z.infer<typeof messageContentSchema>;

export function textContent(text: string): MessageContent {
  return { type: "text", text };
}
