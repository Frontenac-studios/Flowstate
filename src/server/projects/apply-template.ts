import { syncPhaseRow, syncTaskRow } from "@/db/record-sync-mutation";
import { phases, tasks } from "@/db/tables";
import { db } from "@/db";
import type { ProjectCategory } from "@/lib/projects/categories";
import type {
  ProjectTemplateStructure,
  TemplatePhase,
  TemplateTask,
} from "@/lib/projects/template-structure";

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

async function materializePhaseTree(
  tx: DbTransaction,
  userId: string,
  projectId: string,
  category: ProjectCategory,
  nodes: readonly TemplatePhase[],
  parentPhaseId: string | null,
  createdPhases: (typeof phases.$inferSelect)[],
  createdTasks: (typeof tasks.$inferSelect)[]
): Promise<void> {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    const phase = await insertPhase(tx, userId, projectId, node.name, parentPhaseId, index);
    createdPhases.push(phase);
    createdTasks.push(
      ...(await insertTasks(tx, userId, projectId, category, phase.id, node.tasks))
    );
    await materializePhaseTree(
      tx,
      userId,
      projectId,
      category,
      node.subphases,
      phase.id,
      createdPhases,
      createdTasks
    );
  }
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

  await materializePhaseTree(
    tx,
    userId,
    projectId,
    category,
    structure.phases,
    null,
    createdPhases,
    createdTasks
  );

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
