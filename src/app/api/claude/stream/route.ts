import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAnthropicConfigured } from "@/lib/env";
import { threadIdSchema } from "@/lib/chat/threads";
import { appendAssistantMessage } from "@/server/claude/persist-message";
import { streamCompanionReply } from "@/server/claude/generate";
import { getRouteUserId } from "@/server/claude/route-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  threadId: threadIdSchema,
  userMessageId: z.string().uuid(),
  text: z.string().min(1).max(8000),
});

export async function POST(req: Request) {
  const userId = await getRouteUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json({ error: "Claude is not configured." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { threadId, text } = parsed.data;

  try {
    const { stream, getFullText } = await streamCompanionReply({
      userId,
      threadId,
      userText: text,
    });

    const encoder = new TextEncoder();
    let assistantText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              assistantText += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`
                )
              );
            }
          }

          const full = assistantText || (await getFullText());
          if (full) {
            await appendAssistantMessage(userId, threadId, full);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (err) {
          Sentry.captureException(err, {
            extra: { threadId, userMessageLength: text.length },
          });
          const message = "Couldn't reach Claude — try again.";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    Sentry.captureException(err, { extra: { threadId } });
    return NextResponse.json({ error: "Couldn't reach Claude — try again." }, { status: 502 });
  }
}
