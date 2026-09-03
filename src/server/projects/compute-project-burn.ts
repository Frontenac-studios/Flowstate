import "server-only";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { phases, projectFees, projects, tasks, timeEntries } from "@/db/tables";
import { aggregateSecondsByTask } from "@/lib/projects/aggregate-time-rollups";
import {
  computeProjectBurn,
  describeBurn,
  fixedFeeHealth,
  type FixedFeeHealth,
  type ProjectBurn,
} from "@/lib/projects/burn";

/**
 * W15 — assemble a project's estimate-vs-actual from data already on hand.
 *
 * Nothing here is stored. The estimate lives on the phase, the actual is the time
 * log, and the progress is task completion — so the burn is always a read of the
 * present, and there is no derived figure that can drift out of step with the three
 * facts underneath it. (The one thing that IS stored, `offTrackNotifiedAt`, records
 * that we told the user, not what the numbers were.)
 *
 * The money half is fetched separately from `project_fees` (financial-class) and
 * returned in its own field, so a caller that must not surface money can drop it
 * without unpicking the burn.
 */
export type ProjectBurnRead = {
  projectId: string;
  projectName: string;
  billingType: "hourly" | "fixed_fee";
  burn: ProjectBurn;
  /** Null for hourly work, or when no fee has been recorded. */
  fee: FixedFeeHealth | null;
  /** The one-line "running hot" sentence, or null when the project is fine. */
  message: string | null;
};

export async function computeBurnForProjects(
  userId: string,
  projectIds?: string[]
): Promise<ProjectBurnRead[]> {
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      billingType: projects.billingType,
      state: projects.state,
    })
    .from(projects)
    .where(
      projectIds && projectIds.length > 0
        ? and(eq(projects.userId, userId), inArray(projects.id, projectIds))
        : eq(projects.userId, userId)
    );

  if (projectRows.length === 0) return [];
  const ids = projectRows.map((p) => p.id);

  const [phaseRows, taskRows, entryRows, feeRows] = await Promise.all([
    db
      .select({
        id: phases.id,
        projectId: phases.projectId,
        name: phases.name,
        estimateHours: phases.estimateHours,
        completedAt: phases.completedAt,
      })
      .from(phases)
      .where(and(eq(phases.userId, userId), inArray(phases.projectId, ids))),
    db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        phaseId: tasks.phaseId,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNotNull(tasks.projectId))),
    db
      .select({
        taskId: timeEntries.taskId,
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
      })
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId)),
    db
      .select({
        projectId: projectFees.projectId,
        feeAmountCents: projectFees.feeAmountCents,
        targetRateFloorCents: projectFees.targetRateFloorCents,
      })
      .from(projectFees)
      .where(eq(projectFees.userId, userId)),
  ]);

  const secondsByTask = aggregateSecondsByTask(
    entryRows.map((e) => ({ taskId: e.taskId, startedAt: e.startedAt, endedAt: e.endedAt }))
  );

  const feeByProject = new Map(feeRows.map((f) => [f.projectId, f]));

  return projectRows.map((project) => {
    const projectPhases = phaseRows.filter((p) => p.projectId === project.id);
    const projectTasks = taskRows.filter((t) => t.projectId === project.id);

    const phaseInputs = projectPhases.map((phase) => {
      const phaseTasks = projectTasks.filter((t) => t.phaseId === phase.id);
      const done = phaseTasks.filter((t) => t.completedAt !== null).length;

      // A phase marked complete is 100% done even if a stray task was never ticked —
      // the human's judgement outranks the checkbox count.
      const completedPct =
        phase.completedAt !== null
          ? 100
          : phaseTasks.length === 0
            ? 0
            : (done / phaseTasks.length) * 100;

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        estimateHours: phase.estimateHours,
        actualSeconds: phaseTasks.reduce((sum, t) => sum + (secondsByTask.get(t.id) ?? 0), 0),
        completedPct,
      };
    });

    const burn = computeProjectBurn(phaseInputs);
    const feeRow = feeByProject.get(project.id);

    const fee =
      project.billingType === "fixed_fee" && feeRow
        ? fixedFeeHealth({
            feeAmountCents: feeRow.feeAmountCents,
            targetRateFloorCents: feeRow.targetRateFloorCents,
            actualSeconds: phaseInputs.reduce((sum, p) => sum + p.actualSeconds, 0),
          })
        : null;

    return {
      projectId: project.id,
      projectName: project.name,
      billingType: project.billingType,
      burn,
      fee,
      message: describeBurn(burn.total, project.billingType, fee ?? undefined),
    };
  });
}
