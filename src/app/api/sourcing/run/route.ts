import { NextResponse } from "next/server";

import { tickUser, usersNeedingTick, type TickResult } from "@/server/sourcing/run-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * W10i — the sourcing agent's heartbeat. Mirrors the calendar-sync cron: same secret
 * check, same 300-second ceiling, same shape of honest JSON summary.
 *
 * It runs HOURLY rather than weekly, which looks wrong until you count the seconds.
 * Researching one company takes 50–75s, so a five-company batch needs three or four
 * invocations; a weekly cron would give it exactly one and the batch would never
 * finish. So the tick is frequent and the WORK is weekly: `decideRun` starts a batch
 * only on a Tuesday it hasn't already run, and every other tick either advances an
 * unfinished batch or returns having done nothing. An idle tick is a couple of
 * indexed queries.
 *
 * Nothing here decides to spend money. The worker re-checks the opt-in and the 30-day
 * ceiling on every tick, before any call is made.
 */
function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;
  const now = new Date();

  const users = await usersNeedingTick();
  const results: TickResult[] = [];

  for (const user of users) {
    // Stop handing out work once the clock is spent; the next tick continues.
    if (elapsed() > 240_000) break;
    try {
      results.push(await tickUser({ ...user, now, startedAt, elapsed }));
    } catch (e) {
      results.push({
        userId: user.userId,
        action: "idle",
        reason: "error",
        errors: [e instanceof Error ? e.message : "Tick failed."],
      });
    }
  }

  return NextResponse.json({
    usersConsidered: users.length,
    ticked: results.length,
    elapsedMs: elapsed(),
    results,
  });
}
