import "server-only";

import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import {
  careReflections,
  dailyWins,
  goalMilestones,
  goals,
  taskTimeEntries,
  tasks,
} from "@/db/tables";
import type { EvidenceAnchor, EvidenceNarrative } from "@/db/schema/evidence-editions";
import { formatWinLabel } from "@/lib/daily-wins/format-win-label";
import { categorySeedLabel } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";

export type EditionInput = {
  periodStart: string;
  periodEnd: string;
  anchors: EvidenceAnchor[];
  categoryCounts: Partial<Record<ProjectCategory, number>>;
};

export async function aggregateEditionInput(
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<EditionInput> {
  const [winRows, reflectionRows, milestoneRows, timeRows] = await Promise.all([
    db
      .select()
      .from(dailyWins)
      .where(
        and(
          eq(dailyWins.userId, userId),
          eq(dailyWins.state, "accepted"),
          gte(dailyWins.winDate, periodStart),
          lte(dailyWins.winDate, periodEnd)
        )
      ),
    db
      .select()
      .from(careReflections)
      .where(
        and(
          eq(careReflections.userId, userId),
          gte(careReflections.reflectionDate, periodStart),
          lte(careReflections.reflectionDate, periodEnd)
        )
      ),
    db
      .select({
        id: goalMilestones.id,
        title: goalMilestones.title,
        goalTitle: goals.title,
        category: goals.category,
      })
      .from(goalMilestones)
      .innerJoin(goals, eq(goalMilestones.goalId, goals.id))
      .where(and(eq(goalMilestones.userId, userId), eq(goals.state, "done"))),
    db
      .select({ category: tasks.category, startedAt: taskTimeEntries.startedAt })
      .from(taskTimeEntries)
      .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
      .where(
        and(
          eq(taskTimeEntries.userId, userId),
          gte(taskTimeEntries.startedAt, new Date(`${periodStart}T00:00:00Z`)),
          lte(taskTimeEntries.startedAt, new Date(`${periodEnd}T23:59:59Z`))
        )
      ),
  ]);

  const anchors: EvidenceAnchor[] = [];

  for (const win of winRows) {
    anchors.push({
      type: "win",
      id: win.id,
      label: formatWinLabel(win, win.label),
    });
  }

  for (const reflection of reflectionRows) {
    if (!reflection.bodyText?.trim()) continue;
    anchors.push({
      type: "reflection",
      id: reflection.id,
      label: reflection.bodyText.trim().slice(0, 200),
    });
  }

  for (const milestone of milestoneRows) {
    anchors.push({
      type: "milestone",
      id: milestone.id,
      label: `${milestone.title} · ${milestone.goalTitle}`,
    });
  }

  const categoryCounts: Partial<Record<ProjectCategory, number>> = {};
  for (const row of timeRows) {
    categoryCounts[row.category] = (categoryCounts[row.category] ?? 0) + 1;
  }

  return { periodStart, periodEnd, anchors, categoryCounts };
}

export function templateEvidenceNarrative(input: EditionInput): EvidenceNarrative {
  const winCount = input.anchors.filter((a) => a.type === "win").length;
  const reflectionCount = input.anchors.filter((a) => a.type === "reflection").length;

  const topCategory = Object.entries(input.categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const categoryLine = topCategory
    ? `You kept showing up for ${categorySeedLabel(topCategory[0] as ProjectCategory).toLowerCase()}.`
    : "";

  let throughline = "";
  if (winCount === 0 && reflectionCount === 0) {
    throughline = "A quieter stretch — and you still kept the thread.";
  } else if (winCount > 0) {
    throughline =
      `You named ${winCount} win${winCount === 1 ? "" : "s"} in your own words. ${categoryLine}`.trim();
  } else {
    throughline =
      `You wrote ${reflectionCount} reflection${reflectionCount === 1 ? "" : "s"}. ${categoryLine}`.trim();
  }

  return {
    throughline,
    anchors: input.anchors.slice(0, 40),
  };
}
