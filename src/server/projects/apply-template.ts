import { syncPhaseRow, syncTaskRow } from "@/db/record-sync-mutation";
import { phases, tasks } from "@/db/tables";
import { db } from "@/db";
import type { ProjectCategory } from "@/lib/projects/categories";
import type { ProjectTemplateStructure, TemplateTask } from "@/lib/projects/template-structure";

type DbClient = typeof db;
type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

type ApplyTemplateParams = {
  tx: DbTransaction;
  userId: string;
  projectId: string;
  category: ProjectCategory;
  structure: ProjectTemplateStructure;
};

type ApplyTemplateResult = {
  phases: (typeof phases.$inferSelect)[];
  tasks: (typeof tasks.$inferSelect)[];
};

function taskValues(
  userId: string,
  projectId: string,
  category: ProjectCategory,
  phaseId: string | null,
  task: TemplateTask,
  sortOrder: number
) {
  return {
    userId,
    projectId,
    phaseId,
    title: task.title.trim(),
    category,
    priority: 0,
    sortOrder,
    timeEstimateMinutes: task.timeEstimateMinutes ?? null,
    scheduledDate: null,
    bucketOverride: "later" as const,
    suggestedScheduledDate: null,
  };
}

async function insertTasks(
  tx: DbTransaction,
  userId: string,
  projectId: string,
  category: ProjectCategory,
  phaseId: string | null,
  templateTasks: TemplateTask[]
): Promise<(typeof tasks.$inferSelect)[]> {
  const created: (typeof tasks.$inferSelect)[] = [];

  for (let index = 0; index < templateTasks.length; index += 1) {
    const task = templateTasks[index]!;
    const [row] = await tx
      .insert(tasks)
      .values(taskValues(userId, projectId, category, phaseId, task, index))
      .returning();

    if (!row) {
      throw new Error("Failed to create task from template.");
    }

    created.push(row);
  }

  return created;
}

async function insertPhase(
  tx: DbTransaction,
  userId: string,
  projectId: string,
  name: string,
  parentPhaseId: string | null,
  sortOrder: number
) {
  const [row] = await tx
    .insert(phases)
    .values({
      userId,
      projectId,
      parentPhaseId,
      name: name.trim(),
      sortOrder,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create phase from template.");
  }

  return row;
}

/** Materialize phases and tasks from a saved template into a new project. */
export async function applyProjectTemplate({
  tx,
  userId,
  projectId,
  category,
  structure,
}: ApplyTemplateParams): Promise<ApplyTemplateResult> {
  const createdPhases: (typeof phases.$inferSelect)[] = [];
  const createdTasks: (typeof tasks.$inferSelect)[] = [];

  createdTasks.push(
    ...(await insertTasks(tx, userId, projectId, category, null, structure.rootTasks))
  );

  for (let phaseIndex = 0; phaseIndex < structure.phases.length; phaseIndex += 1) {
    const phaseTemplate = structure.phases[phaseIndex]!;
    const phase = await insertPhase(tx, userId, projectId, phaseTemplate.name, null, phaseIndex);
    createdPhases.push(phase);
    createdTasks.push(
      ...(await insertTasks(tx, userId, projectId, category, phase.id, phaseTemplate.tasks))
    );

    for (let subIndex = 0; subIndex < phaseTemplate.subphases.length; subIndex += 1) {
      const subphaseTemplate = phaseTemplate.subphases[subIndex]!;
      const subphase = await insertPhase(
        tx,
        userId,
        projectId,
        subphaseTemplate.name,
        phase.id,
        subIndex
      );
      createdPhases.push(subphase);
      createdTasks.push(
        ...(await insertTasks(tx, userId, projectId, category, subphase.id, subphaseTemplate.tasks))
      );
    }
  }

  return { phases: createdPhases, tasks: createdTasks };
}

export async function syncAppliedTemplateRows(result: ApplyTemplateResult): Promise<void> {
  for (const row of result.phases) {
    await syncPhaseRow(row.id, "insert", row);
  }
  for (const row of result.tasks) {
    await syncTaskRow(row.id, "insert", row);
  }
}
