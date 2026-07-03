import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { phases, projects } from "@/db/tables";
import {
  newProposalItemId,
  proposedActionSchema,
  type ProposedAction,
} from "@/lib/chat/proposed-actions";
import { findProjectBySlug } from "@/lib/parser/fuzzy-project";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

import { resolveOwnedTaskTitles } from "./apply-proposed-action";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type EditTaskInput = {
  edits?: {
    taskId?: string;
    title?: string;
    nextTitle?: string;
    priority?: number;
    category?: string;
    scheduledDate?: string | null;
    projectSlug?: string | null;
    phaseId?: string | null;
  }[];
  summary?: string;
};

type DeleteTaskInput = { taskIds?: string[]; summary?: string };

type SetTop3Input = {
  slots?: { taskId?: string; slot?: number }[];
  summary?: string;
};

type SetProtectedBlockInput = {
  blocks?: {
    category?: string;
    scheduledDate?: string;
    label?: string | null;
    startMin?: number | null;
    endMin?: number | null;
    status?: "proposed" | "confirmed";
  }[];
  summary?: string;
};

type SetDayPrioritiesInput = {
  priorities?: { taskId?: string; scheduledDate?: string; slot?: number }[];
  summary?: string;
};

type ApplyBalanceSuggestionsInput = {
  suggestions?: {
    category?: string;
    taskTitle?: string;
    taskId?: string | null;
    scheduledDate?: string | null;
  }[];
  summary?: string;
};

type CreateProjectInput = {
  projects?: { name?: string; slug?: string; category?: string }[];
  summary?: string;
};

type EditPhaseInput = {
  phases?: {
    phaseId?: string;
    projectSlug?: string;
    name?: string;
    description?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }[];
  summary?: string;
};

type MoveTaskToPhaseInput = {
  moves?: { taskId?: string; phaseId?: string | null; phaseName?: string; projectSlug?: string }[];
  summary?: string;
};

type ReplanProjectDatesInput = {
  projectSlug?: string;
  phases?: {
    phaseId?: string;
    startDate?: string | null;
    endDate?: string | null;
  }[];
  summary?: string;
};

function isCategory(value: string | undefined): value is ProjectCategory {
  return value != null && (PROJECT_CATEGORIES as readonly string[]).includes(value);
}

function isTop3Slot(value: number | undefined): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

export async function buildEditTaskProposal(
  userId: string,
  input: EditTaskInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const rows = input.edits?.filter((e) => e.taskId) ?? [];
  if (rows.length === 0) return { ok: false, error: "edits array is required" };

  const titleById = await resolveOwnedTaskTitles(
    userId,
    rows.map((r) => r.taskId!)
  );

  const items = rows
    .filter((row) => titleById.has(row.taskId!))
    .map((row) => {
      const patch: Record<string, unknown> = {};
      if (row.nextTitle?.trim() || row.title?.trim()) {
        patch.nextTitle = (row.nextTitle ?? row.title)!.trim();
      }
      if (row.priority != null) patch.priority = row.priority;
      if (row.category && isCategory(row.category)) patch.category = row.category;
      if (row.scheduledDate !== undefined) {
        if (row.scheduledDate !== null && !ISO_DATE.test(row.scheduledDate)) {
          return null;
        }
        patch.scheduledDate = row.scheduledDate;
      }
      if (row.projectSlug !== undefined) patch.projectSlug = row.projectSlug;
      if (row.phaseId !== undefined) patch.phaseId = row.phaseId;

      return {
        itemId: newProposalItemId(),
        enabled: true,
        taskId: row.taskId!,
        title: titleById.get(row.taskId!) ?? "Task",
        ...patch,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  if (items.length === 0) return { ok: false, error: "No owned tasks matched the edit IDs." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "edit_task",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export async function buildDeleteTaskProposal(
  userId: string,
  input: DeleteTaskInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const ids = input.taskIds?.filter(Boolean) ?? [];
  if (ids.length === 0) return { ok: false, error: "taskIds array is required" };

  const titleById = await resolveOwnedTaskTitles(userId, ids);
  const items = ids
    .filter((id) => titleById.has(id))
    .map((id) => ({
      itemId: newProposalItemId(),
      enabled: true,
      taskId: id,
      title: titleById.get(id) ?? "Task",
    }));

  if (items.length === 0) return { ok: false, error: "No owned tasks matched the IDs." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "delete_task",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export async function buildSetTop3Proposal(
  userId: string,
  input: SetTop3Input
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const rows = input.slots?.filter((s) => s.taskId && isTop3Slot(s.slot)) ?? [];
  if (rows.length === 0) return { ok: false, error: "slots array is required" };

  const titleById = await resolveOwnedTaskTitles(
    userId,
    rows.map((r) => r.taskId!)
  );

  const items = rows
    .filter((row) => titleById.has(row.taskId!))
    .map((row) => ({
      itemId: newProposalItemId(),
      enabled: true,
      taskId: row.taskId!,
      title: titleById.get(row.taskId!) ?? "Task",
      slot: row.slot!,
    }));

  if (items.length === 0) return { ok: false, error: "No owned tasks matched the slot IDs." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "set_top3",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export function buildSetProtectedBlockProposal(
  input: SetProtectedBlockInput
): { ok: true; proposal: ProposedAction } | { ok: false; error: string } {
  const rows = input.blocks ?? [];
  if (rows.length === 0) return { ok: false, error: "blocks array is required" };

  const items = rows
    .filter(
      (row) => row.scheduledDate && ISO_DATE.test(row.scheduledDate) && isCategory(row.category)
    )
    .map((row) => ({
      itemId: newProposalItemId(),
      enabled: true,
      category: row.category as ProjectCategory,
      scheduledDate: row.scheduledDate!,
      label: row.label ?? null,
      startMin: row.startMin ?? null,
      endMin: row.endMin ?? null,
      status: row.status ?? "confirmed",
    }));

  if (items.length === 0) return { ok: false, error: "No valid protected blocks in proposal." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "set_protected_block",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export async function buildSetDayPrioritiesProposal(
  userId: string,
  input: SetDayPrioritiesInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const rows =
    input.priorities?.filter((p) => p.taskId && p.scheduledDate && isTop3Slot(p.slot)) ?? [];
  if (rows.length === 0) return { ok: false, error: "priorities array is required" };

  for (const row of rows) {
    if (!ISO_DATE.test(row.scheduledDate!)) {
      return { ok: false, error: "scheduledDate must be YYYY-MM-DD" };
    }
  }

  const titleById = await resolveOwnedTaskTitles(
    userId,
    rows.map((r) => r.taskId!)
  );

  const items = rows
    .filter((row) => titleById.has(row.taskId!))
    .map((row) => ({
      itemId: newProposalItemId(),
      enabled: true,
      taskId: row.taskId!,
      title: titleById.get(row.taskId!) ?? "Task",
      scheduledDate: row.scheduledDate!,
      slot: row.slot!,
    }));

  if (items.length === 0) return { ok: false, error: "No owned tasks matched the priority IDs." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "set_day_priorities",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export function buildApplyBalanceSuggestionsProposal(
  input: ApplyBalanceSuggestionsInput
): { ok: true; proposal: ProposedAction } | { ok: false; error: string } {
  const rows = input.suggestions ?? [];
  if (rows.length === 0) return { ok: false, error: "suggestions array is required" };

  const items = rows
    .filter((row) => row.taskTitle?.trim() && isCategory(row.category))
    .map((row) => ({
      itemId: newProposalItemId(),
      enabled: true,
      category: row.category as ProjectCategory,
      taskTitle: row.taskTitle!.trim(),
      taskId: row.taskId ?? null,
      scheduledDate:
        row.scheduledDate && ISO_DATE.test(row.scheduledDate) ? row.scheduledDate : null,
    }));

  if (items.length === 0) return { ok: false, error: "No valid balance suggestions." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "apply_balance_suggestions",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export function buildCreateProjectProposal(
  input: CreateProjectInput
): { ok: true; proposal: ProposedAction } | { ok: false; error: string } {
  const rows = input.projects?.filter((p) => p.name?.trim() && isCategory(p.category)) ?? [];
  if (rows.length === 0) return { ok: false, error: "projects array is required" };

  const items = rows.map((row) => ({
    itemId: newProposalItemId(),
    enabled: true,
    name: row.name!.trim(),
    slug: row.slug?.trim(),
    category: row.category as ProjectCategory,
  }));

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "create_project",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export async function buildEditPhaseProposal(
  userId: string,
  input: EditPhaseInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const rows = input.phases?.filter((p) => p.phaseId) ?? [];
  if (rows.length === 0) return { ok: false, error: "phases array is required" };

  const phaseRows = await db
    .select({
      id: phases.id,
      name: phases.name,
      projectId: phases.projectId,
      slug: projects.slug,
    })
    .from(phases)
    .innerJoin(projects, eq(phases.projectId, projects.id))
    .where(
      and(
        eq(phases.userId, userId),
        inArray(
          phases.id,
          rows.map((r) => r.phaseId!)
        )
      )
    );

  const phaseById = new Map(phaseRows.map((row) => [row.id, row]));

  const items = rows
    .filter((row) => phaseById.has(row.phaseId!))
    .map((row) => {
      const phase = phaseById.get(row.phaseId!)!;
      return {
        itemId: newProposalItemId(),
        enabled: true,
        phaseId: row.phaseId!,
        phaseName: phase.name,
        projectSlug: row.projectSlug?.trim() || phase.slug,
        name: row.name?.trim(),
        description: row.description,
        startDate: row.startDate,
        endDate: row.endDate,
      };
    })
    .filter((item) =>
      [item.name, item.description, item.startDate, item.endDate].some((v) => v !== undefined)
    );

  if (items.length === 0) return { ok: false, error: "No owned phases with edits matched." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "edit_phase",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export async function buildMoveTaskToPhaseProposal(
  userId: string,
  input: MoveTaskToPhaseInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const rows = input.moves?.filter((m) => m.taskId) ?? [];
  if (rows.length === 0) return { ok: false, error: "moves array is required" };

  const titleById = await resolveOwnedTaskTitles(
    userId,
    rows.map((r) => r.taskId!)
  );

  const phaseIds = rows.map((r) => r.phaseId).filter((id): id is string => id != null);
  const phaseRows =
    phaseIds.length > 0
      ? await db
          .select({ id: phases.id, name: phases.name })
          .from(phases)
          .where(and(eq(phases.userId, userId), inArray(phases.id, phaseIds)))
      : [];
  const phaseNameById = new Map(phaseRows.map((row) => [row.id, row.name]));

  const items = rows
    .filter((row) => titleById.has(row.taskId!))
    .map((row) => ({
      itemId: newProposalItemId(),
      enabled: true,
      taskId: row.taskId!,
      title: titleById.get(row.taskId!) ?? "Task",
      phaseId: row.phaseId ?? null,
      phaseName: row.phaseId ? (phaseNameById.get(row.phaseId) ?? row.phaseName ?? null) : null,
      projectSlug: row.projectSlug ?? null,
    }));

  if (items.length === 0) return { ok: false, error: "No owned tasks matched the move IDs." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "move_task_to_phase",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

export async function buildReplanProjectDatesProposal(
  userId: string,
  input: ReplanProjectDatesInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const rows = input.phases?.filter((p) => p.phaseId) ?? [];
  if (rows.length === 0) return { ok: false, error: "phases array is required" };

  const phaseRows = await db
    .select({
      id: phases.id,
      name: phases.name,
      slug: projects.slug,
    })
    .from(phases)
    .innerJoin(projects, eq(phases.projectId, projects.id))
    .where(
      and(
        eq(phases.userId, userId),
        inArray(
          phases.id,
          rows.map((r) => r.phaseId!)
        )
      )
    );

  let filtered = phaseRows;
  if (input.projectSlug?.trim()) {
    const projectRows = await db
      .select({ id: projects.id, slug: projects.slug, name: projects.name })
      .from(projects)
      .where(eq(projects.userId, userId));
    const match = findProjectBySlug(input.projectSlug.trim(), projectRows);
    if (match) filtered = phaseRows.filter((row) => row.slug === match.slug);
  }

  const phaseById = new Map(filtered.map((row) => [row.id, row]));

  const items = rows
    .filter((row) => phaseById.has(row.phaseId!))
    .map((row) => {
      const phase = phaseById.get(row.phaseId!)!;
      if (row.startDate != null && !ISO_DATE.test(row.startDate)) return null;
      if (row.endDate != null && !ISO_DATE.test(row.endDate)) return null;
      return {
        itemId: newProposalItemId(),
        enabled: true,
        phaseId: row.phaseId!,
        phaseName: phase.name,
        projectSlug: phase.slug,
        startDate: row.startDate,
        endDate: row.endDate,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  if (items.length === 0) return { ok: false, error: "No owned phases with date updates matched." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "replan_project_dates",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}
