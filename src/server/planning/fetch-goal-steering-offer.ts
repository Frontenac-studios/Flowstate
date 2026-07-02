import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, goalMilestones, goals, nudgeEvents, tasks } from "@/db/tables";
import { milestoneIsComplete } from "@/lib/planning/goal-progress";
import type { GoalSteeringOffer } from "@/lib/planning/goal-journey";
import {
  goalSteeringNudgeTaskIds,
  parseGoalIdFromNudgeTaskIds,
  pickRotatedGoalId,
} from "@/lib/planning/goal-steering-rotation";
import type { ProjectCategory } from "@/lib/projects/categories";

type GoalRow = typeof goals.$inferSelect;

async function isGoalSteeringEnabled(userId: string): Promise<boolean> {
  const [settingsRow] = await db
    .select({
      goalSteering: appSettings.goalSteering,
      assistanceEnabled: appSettings.assistanceEnabled,
    })
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);

  return (settingsRow?.assistanceEnabled ?? true) && (settingsRow?.goalSteering ?? "on") === "on";
}

async function fetchGoalSteeringHistory(userId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({
      localDate: nudgeEvents.localDate,
      taskIds: nudgeEvents.taskIds,
    })
    .from(nudgeEvents)
    .where(and(eq(nudgeEvents.userId, userId), eq(nudgeEvents.kind, "goal_step")))
    .orderBy(desc(nudgeEvents.localDate));

  const lastOfferedByGoal = new Map<string, string>();
  for (const row of rows) {
    const goalId = parseGoalIdFromNudgeTaskIds(row.taskIds);
    if (!goalId || lastOfferedByGoal.has(goalId)) continue;
    lastOfferedByGoal.set(goalId, row.localDate);
  }
  return lastOfferedByGoal;
}

async function buildOfferForGoal(userId: string, goal: GoalRow): Promise<GoalSteeringOffer | null> {
  const milestoneRows = await db
    .select()
    .from(goalMilestones)
    .where(and(eq(goalMilestones.userId, userId), eq(goalMilestones.goalId, goal.id)))
    .orderBy(asc(goalMilestones.sortOrder));

  for (const milestone of milestoneRows) {
    const linkedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.milestoneId, milestone.id)))
      .orderBy(asc(tasks.createdAt));

    const counts = {
      total: linkedTasks.length,
      completed: linkedTasks.filter((t) => t.completedAt != null).length,
    };
    if (milestoneIsComplete(counts)) continue;

    const nextTask = linkedTasks.find((t) => !t.completedAt);
    if (nextTask) {
      return {
        goalId: goal.id,
        goalTitle: goal.title,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        stepTitle: nextTask.title,
        category: goal.category as ProjectCategory,
      };
    }

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      stepTitle: milestone.title,
      category: goal.category as ProjectCategory,
    };
  }

  return null;
}

export async function fetchGoalSteeringOffer(userId: string): Promise<GoalSteeringOffer | null> {
  if (!(await isGoalSteeringEnabled(userId))) return null;

  const goalRows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.state, "active")))
    .orderBy(asc(goals.sortOrder));

  if (goalRows.length === 0) return null;

  const lastOfferedByGoal = await fetchGoalSteeringHistory(userId);
  const rotatedGoalId = pickRotatedGoalId(
    goalRows.map((goal) => goal.id),
    lastOfferedByGoal
  );
  if (!rotatedGoalId) return null;

  const goal = goalRows.find((row) => row.id === rotatedGoalId);
  if (!goal) return null;

  return buildOfferForGoal(userId, goal);
}

export async function fetchGoalSteeringOfferForGoal(
  userId: string,
  goalId: string
): Promise<GoalSteeringOffer | null> {
  if (!(await isGoalSteeringEnabled(userId))) return null;

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId), eq(goals.state, "active")))
    .limit(1);

  if (!goal) return null;
  return buildOfferForGoal(userId, goal);
}

export async function recordGoalSteeringNudge(
  userId: string,
  localDate: string,
  goalId: string
): Promise<void> {
  try {
    await db.insert(nudgeEvents).values({
      userId,
      kind: "goal_step",
      localDate,
      taskIds: goalSteeringNudgeTaskIds(goalId),
    });
  } catch {
    // Unique (user, kind, local_date) — idempotent across tabs.
  }
}

export async function pullGoalStepToToday(
  userId: string,
  offer: GoalSteeringOffer,
  localDate: string
): Promise<{ taskId: string; created: boolean } | null> {
  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.milestoneId, offer.milestoneId),
        isNull(tasks.completedAt)
      )
    )
    .orderBy(asc(tasks.createdAt))
    .limit(1);

  if (existing) {
    await db
      .update(tasks)
      .set({ scheduledDate: localDate, bucketOverride: null, updatedAt: new Date() })
      .where(and(eq(tasks.id, existing.id), eq(tasks.userId, userId)));
    return { taskId: existing.id, created: false };
  }

  const [created] = await db
    .insert(tasks)
    .values({
      userId,
      title: offer.stepTitle,
      category: offer.category,
      milestoneId: offer.milestoneId,
      scheduledDate: localDate,
      bucketOverride: null,
    })
    .returning({ id: tasks.id });

  if (!created) return null;
  return { taskId: created.id, created: true };
}
