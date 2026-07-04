import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { syncPhaseRow } from "@/db/record-sync-mutation";
import { phases, projects, tasks, taskTimeEntries } from "@/db/tables";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import {
  newProposalItemId,
  proposedActionSchema,
  type ProposedAction,
} from "@/lib/chat/proposed-actions";
import {
  aggregateSecondsByTask,
  rollupProjectPhaseTime,
} from "@/lib/projects/aggregate-time-rollups";
import { detectProjectSlip, type SlipPhaseCandidate } from "@/lib/projects/detect-project-slip";
import {
  buildPhaseTree,
  resolveEffectivePhaseRange,
  type PhaseTreeNode,
} from "@/lib/projects/phase-tree";
import { proposeSlipReplanDates, type ReplanPhaseInput } from "@/lib/projects/propose-slip-replan";

type PhaseRow = {
  id: string;
  projectId: string;
  parentPhaseId: string | null;
  name: string;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
};

type TaskRow = {
  id: string;
  phaseId: string | null;
  sortOrder: number;
  scheduledDate: string | null;
  completedAt: Date | null;
};

function collectLeafNodes(
  nodes: PhaseTreeNode<PhaseRow, TaskRow>[]
): PhaseTreeNode<PhaseRow, TaskRow>[] {
  const leaves: PhaseTreeNode<PhaseRow, TaskRow>[] = [];
  for (const node of nodes) {
    if (node.children.length === 0) leaves.push(node);
    else leaves.push(...collectLeafNodes(node.children));
  }
  return leaves;
}

function buildSlipCandidates(leaves: PhaseTreeNode<PhaseRow, TaskRow>[]): SlipPhaseCandidate[] {
  return leaves.map((node) => {
    const effective = resolveEffectivePhaseRange(node);
    const incompleteTasks = node.tasks.filter((task) => task.completedAt === null);
    const hasTaskScheduledPastEnd =
      effective.end !== null &&
      incompleteTasks.some(
        (task) => task.scheduledDate !== null && task.scheduledDate > effective.end!
      );

    return {
      phaseId: node.phase.id,
      phaseName: node.phase.name,
      effectiveStart: effective.start,
      effectiveEnd: effective.end,
      incompleteTaskCount: incompleteTasks.length,
      hasTaskScheduledPastEnd,
    };
  });
}

function toReplanInputs(
  slipped: SlipPhaseCandidate[],
  leaves: PhaseTreeNode<PhaseRow, TaskRow>[],
  byPhaseSeconds: Record<string, number>
): ReplanPhaseInput[] {
  const leafById = new Map(leaves.map((node) => [node.phase.id, node]));

  return slipped
    .map((slip) => {
      const node = leafById.get(slip.phaseId);
      if (!node) return null;

      const completedTasks = node.tasks.filter((task) => task.completedAt !== null);
      return {
        phaseId: slip.phaseId,
        phaseName: slip.phaseName,
        sortOrder: node.phase.sortOrder,
        currentStart: slip.effectiveStart,
        currentEnd: slip.effectiveEnd,
        timeSpentSeconds: byPhaseSeconds[slip.phaseId] ?? 0,
        incompleteTaskCount: slip.incompleteTaskCount,
        completedTaskCount: completedTasks.length,
      };
    })
    .filter((row): row is ReplanPhaseInput => row != null);
}

export async function buildProjectSlipReplanProposal(
  userId: string,
  projectId: string
): Promise<ProposedAction | null> {
  const [project, phaseRows, taskRows, timeRows] = await Promise.all([
    db
      .select({ id: projects.id, slug: projects.slug, name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: phases.id,
        projectId: phases.projectId,
        parentPhaseId: phases.parentPhaseId,
        name: phases.name,
        sortOrder: phases.sortOrder,
        startDate: phases.startDate,
        endDate: phases.endDate,
      })
      .from(phases)
      .where(and(eq(phases.projectId, projectId), eq(phases.userId, userId))),
    db
      .select({
        id: tasks.id,
        phaseId: tasks.phaseId,
        sortOrder: tasks.sortOrder,
        scheduledDate: tasks.scheduledDate,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId))),
    db
      .select({
        taskId: taskTimeEntries.taskId,
        startedAt: taskTimeEntries.startedAt,
        endedAt: taskTimeEntries.endedAt,
      })
      .from(taskTimeEntries)
      .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
      .where(and(eq(tasks.projectId, projectId), eq(taskTimeEntries.userId, userId))),
  ]);

  if (!project || phaseRows.length === 0) return null;

  const tree = buildPhaseTree(phaseRows, taskRows);
  const leaves = collectLeafNodes(tree.rootPhases);
  const todayIso = toISODateString(startOfLocalDay());

  const candidates = buildSlipCandidates(leaves);
  const slipped = detectProjectSlip({ todayIso, phases: candidates });
  if (slipped.length === 0) return null;

  const byTaskSeconds = aggregateSecondsByTask(timeRows);
  const rollups = rollupProjectPhaseTime({
    tasks: taskRows.map((task) => ({ id: task.id, phaseId: task.phaseId })),
    phases: phaseRows.map((phase) => ({ id: phase.id, parentPhaseId: phase.parentPhaseId })),
    byTaskSeconds,
  });

  const replanInputs = toReplanInputs(slipped, leaves, rollups.byPhaseId);
  const proposals = proposeSlipReplanDates(todayIso, replanInputs);
  if (proposals.length === 0) return null;

  return proposedActionSchema.parse({
    kind: "replan_project_dates",
    status: "pending",
    summary: `${project.name} slipped — replan phase dates from your logged time?`,
    items: proposals.map((item) => ({
      itemId: newProposalItemId(),
      enabled: true,
      phaseId: item.phaseId,
      phaseName: item.phaseName,
      projectSlug: project.slug,
      startDate: item.startDate,
      endDate: item.endDate,
      previousStartDate: item.previousStartDate,
      previousEndDate: item.previousEndDate,
    })),
  });
}

export async function applyProjectSlipReplanProposal(
  userId: string,
  action: Extract<ProposedAction, { kind: "replan_project_dates" }>
): Promise<{ applied: number; titles: string[] }> {
  const titles: string[] = [];
  let applied = 0;

  for (const item of action.items) {
    const [existing] = await db
      .select()
      .from(phases)
      .where(and(eq(phases.id, item.phaseId), eq(phases.userId, userId)))
      .limit(1);

    if (!existing) continue;

    const patch: Partial<typeof phases.$inferInsert> = { updatedAt: new Date() };
    if (item.startDate !== undefined) patch.startDate = item.startDate;
    if (item.endDate !== undefined) patch.endDate = item.endDate;
    if (patch.startDate === undefined && patch.endDate === undefined) continue;

    const [row] = await db
      .update(phases)
      .set(patch)
      .where(and(eq(phases.id, item.phaseId), eq(phases.userId, userId)))
      .returning();

    if (row) {
      await syncPhaseRow(row.id, "update", row);
      titles.push(`${item.phaseName}: ${row.startDate ?? "?"} → ${row.endDate ?? "?"}`);
      applied += 1;
    }
  }

  return { applied, titles };
}
