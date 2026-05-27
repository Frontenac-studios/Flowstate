import { NextResponse } from "next/server";
import { z } from "zod";

import { runNudgeEvaluation } from "@/server/nudges/run-nudge-evaluation";
import { getRouteUserId } from "@/server/claude/route-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tzOffsetMinutes: z.number().int().min(-840).max(840),
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

  try {
    const result = await runNudgeEvaluation({
      userId,
      localDate: parsed.data.localDate,
      tzOffsetMinutes: parsed.data.tzOffsetMinutes,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nudge evaluation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
