import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { focusThreadId } from "@/lib/chat/threads";
import { isAnthropicConfigured } from "@/lib/env";
import { fallbackNarration, generateNarration } from "@/server/claude/generate";
import { getRouteUserId } from "@/server/claude/route-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1),
  isTop3: z.boolean(),
  priority: z.number().int().min(0).max(3),
  projectSlug: z.string().nullable().optional(),
  pickReason: z.string().optional(),
});

export async function POST(req: Request) {
  const userId = await getRouteUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { taskId, title, isTop3, priority, projectSlug, pickReason } = parsed.data;
  const threadId = focusThreadId(taskId);
  const taskInput = {
    taskId,
    title,
    isTop3,
    priority,
    projectSlug: projectSlug ?? null,
    pickReason: pickReason ?? "weighted-rdm",
  };

  const configured = isAnthropicConfigured();
  Sentry.addBreadcrumb({
    category: "kash.claude",
    message: "narrate",
    level: "info",
    data: { taskId, isTop3, configured },
  });

  if (!configured) {
    return NextResponse.json({
      narration: fallbackNarration(taskInput),
      configured: false,
    });
  }

  try {
    const narration = await generateNarration(userId, threadId, taskInput);
    return NextResponse.json({ narration, configured: true });
  } catch (err) {
    Sentry.captureException(err, { extra: { taskId, isTop3 } });
    return NextResponse.json({
      narration: fallbackNarration(taskInput),
      configured: true,
      fallback: true,
    });
  }
}
