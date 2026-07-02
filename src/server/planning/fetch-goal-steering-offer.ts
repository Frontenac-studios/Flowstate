import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, goalMilestones, goals, tasks } from "@/db/tables";
import { milestoneIsComplete } from "@/lib/planning/goal-progress";
import type { GoalSteeringOffer } from "@/lib/planning/goal-journey";
import type { ProjectCategory } from "@/lib/projects/categories";

export async function fetchGoalSteeringOffer(userId: string): Promise<GoalSteeringOffer | null> {
  const [settingsRow, goalRows] = await Promise.all([
    db
      .select({
        goalSteering: appSettings.goalSteering,
        assistanceEnabled: appSettings.assistanceEnabled,
      })
      .from(appSettings)
      .where(eq(appSettings.userId, userId))
      .limit(1),
    db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.state, "active")))
      .orderBy(asc(goals.sortOrder)),
  ]);

  const enabled =
    (settingsRow[0]?.assistanceEnabled ?? true) && (settingsRow[0]?.goalSteering ?? "on") === "on";
  if (!enabled || goalRows.length === 0) return null;

  const goal = goalRows[0];
  if (!goal) return null;

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

export async function pullGoalStepToToday(
  userId: string,
  offer: GoalSteeringOffer,
  localDate: string
): Promise<string | null> {
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
    return existing.id;
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

  return created?.id ?? null;
}
