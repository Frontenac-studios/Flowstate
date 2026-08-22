import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { focusThreadId } from "@/lib/chat/threads";
import { isModelConfigured } from "@/lib/env";
import { fallbackNarration, generateNarration } from "@/server/claude/generate";
import { getRouteUserId } from "@/server/claude/route-auth";
import { FLAGS } from "@/lib/flags";

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
  // Chat parked (docs/v1-scope.md §3.2). The route stays registered but
  // answers nothing, so a parked feature has no reachable surface at all.
  if (!FLAGS.chat) return new NextResponse(null, { status: 404 });

  const userId = await getRouteUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
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

  const configured = isModelConfigured();
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
