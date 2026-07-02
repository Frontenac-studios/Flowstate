import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { goalMilestones, goals } from "@/db/tables";
import { generateEvidenceEdition } from "@/server/evidence/generate-edition";
import { qualifiesGoalForEvidenceEdition } from "@/lib/evidence/qualifies-goal-for-evidence";
import { toISODateString } from "@/lib/dates/local-day";
import { startOfLocalDay } from "@/lib/dates/local-day";

export { qualifiesGoalForEvidenceEdition };

export async function maybeTriggerEvidenceMilestoneEdition(
  userId: string,
  goalId: string
): Promise<void> {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);

  if (!goal || goal.state !== "done") return;

  const [milestoneCount] = await db
    .select({ count: count() })
    .from(goalMilestones)
    .where(and(eq(goalMilestones.goalId, goalId), eq(goalMilestones.userId, userId)));

  const isLarge = qualifiesGoalForEvidenceEdition(goal.targetHorizon, milestoneCount?.count ?? 0);

  if (!isLarge) return;

  const todayIso = toISODateString(startOfLocalDay());
  const yearStart = `${todayIso.slice(0, 4)}-01-01`;
  const yearEnd = `${todayIso.slice(0, 4)}-12-31`;

  await generateEvidenceEdition({
    userId,
    kind: "milestone",
    periodStart: yearStart,
    periodEnd: yearEnd,
    refId: goalId,
  });
}
