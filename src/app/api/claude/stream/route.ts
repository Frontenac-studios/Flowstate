import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAnthropicConfigured } from "@/lib/env";
import { threadIdSchema } from "@/lib/chat/threads";
import { captureContextSchema } from "@/lib/chat/capture-context";
import { composeAssistantMessage } from "@/lib/chat/compose-assistant-message";
import { planningSurfaceSchema } from "@/lib/chat/planning-surface";
import { appendAssistantMessage } from "@/server/claude/persist-message";
import { streamCompanionReply } from "@/server/claude/generate";
import { getRouteUserId } from "@/server/claude/route-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  threadId: threadIdSchema,
  userMessageId: z.string().uuid(),
  text: z.string().min(1).max(8000),
  planningSurface: planningSurfaceSchema.nullish(),
  captureContext: captureContextSchema.nullish(),
});

export async function POST(req: Request) {
  const userId = await getRouteUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAnthropicConfigured()) {
    return NextResponse.json({ error: "Claude is not configured." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { threadId, text } = parsed.data;

  Sentry.addBreadcrumb({
    category: "kash.claude",
    message: "stream",
    level: "info",
    data: { threadId, textLength: text.length },
  });

  try {
    const { stream, getFullText, getMutatedTasks, getPendingProposal, getToolErrors } =
      await streamCompanionReply({
        userId,
        threadId,
        userText: text,
        planningSurface: parsed.data.planningSurface ?? null,
        captureContext: parsed.data.captureContext ?? null,
        signal: req.signal,
      });

    const encoder = new TextEncoder();
    let assistantText = "";
    let saved = false;

    const saveAssistant = async (partial: string) => {
      if (saved) return;
      const proposal = getPendingProposal();
      const text = composeAssistantMessage({
        prose: partial,
        proposal,
        toolErrors: getToolErrors(),
      });
      if (!text) return;
      saved = true;
      await appendAssistantMessage(userId, threadId, text, undefined, proposal ?? undefined);
    };

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (req.signal.aborted) {
              await saveAssistant(assistantText || getFullText());
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "cancelled" })}\n\n`)
              );
              controller.close();
              return;
            }

            if (event.type === "delta") {
              assistantText += event.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "delta", text: event.text })}\n\n`)
              );
            }

            if (event.type === "proposal") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "proposal", proposal: event.proposal })}\n\n`
                )
              );
            }
          }

          if (req.signal.aborted) {
            await saveAssistant(assistantText || getFullText());
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "cancelled" })}\n\n`)
            );
            controller.close();
            return;
          }

          const full = assistantText || getFullText();
          await saveAssistant(full);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                mutatedTasks: getMutatedTasks(),
                proposal: getPendingProposal(),
              })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          Sentry.captureException(err, { extra: { threadId, userMessageLength: text.length } });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Couldn't reach Claude — try again." })}\n\n`
            )
          );
          controller.close();
        }
      },
      async cancel() {
        await saveAssistant(assistantText || getFullText());
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
