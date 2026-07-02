import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { runNudgeEvaluation } from "@/server/nudges/run-nudge-evaluation";
import { getRouteUserId } from "@/server/claude/route-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tzOffsetMinutes: z.number().int().min(-840).max(840),
  includeSelfCare: z.boolean().optional(),
  includeMonthlyReview: z.boolean().optional(),
  includeEvidenceSurface: z.boolean().optional(),
});

export async function POST(req: Request) {
  const userId = await getRouteUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    localDate,
    tzOffsetMinutes,
    includeSelfCare,
    includeMonthlyReview,
    includeEvidenceSurface,
  } = parsed.data;

  Sentry.addBreadcrumb({
    category: "kash.nudge",
    message: "evaluate",
    level: "info",
    data: { localDate, tzOffsetMinutes },
  });

  try {
    const result = await runNudgeEvaluation({
      userId,
      localDate,
      tzOffsetMinutes,
      includeSelfCare: includeSelfCare ?? false,
      includeMonthlyReview: includeMonthlyReview ?? false,
      includeEvidenceSurface: includeEvidenceSurface ?? false,
    });

    Sentry.addBreadcrumb({
      category: "kash.nudge",
      message: "evaluate.result",
      level: "info",
      data: {
        fired: result.fired,
        stalledCount: result.stalledCount,
        slippedCount: result.slippedCount,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    Sentry.captureException(err, { extra: { localDate, tzOffsetMinutes } });
    const message = err instanceof Error ? err.message : "Nudge evaluation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
