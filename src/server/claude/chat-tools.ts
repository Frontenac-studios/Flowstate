import "server-only";

import { and, desc, eq, gte, ilike, isNull, lte, ne } from "drizzle-orm";

import { db } from "@/db";
import { syncAbyssItemRow } from "@/db/record-sync-mutation";
import { abyssItems, projects, tasks } from "@/db/tables";
import {
  newProposalItemId,
  type ProposedAction,
  proposedActionSchema,
} from "@/lib/chat/proposed-actions";
import { findProjectBySlug } from "@/lib/parser/fuzzy-project";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { normalizeChatToolProposal } from "@/server/about-me/normalize-tool-proposal";
import { proposeAboutMeEdit } from "@/server/about-me/propose-about-me-edit";
import type { KashRegister } from "@/server/claude/system-prompts";
import {
  PLANNING_CHAT_TOOLS,
  toolsForRegister,
  toolsForSurface,
} from "@/lib/chat/chat-tool-catalog";

import { applyProposedActionPayload, resolveOwnedTaskTitles } from "./apply-proposed-action";
import {
  buildApplyBalanceSuggestionsProposal,
  buildCreateProjectProposal,
  buildDeleteTaskProposal,
  buildEditPhaseProposal,
  buildEditTaskProposal,
  buildMoveTaskToPhaseProposal,
  buildReplanProjectDatesProposal,
  buildSetDayPrioritiesProposal,
  buildSetProtectedBlockProposal,
  buildSetTop3Proposal,
} from "./build-tool-proposals";
import { assembleChatContext } from "./assemble-chat-context";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const CHAT_TOOLS = PLANNING_CHAT_TOOLS;
export { toolsForRegister, toolsForSurface };

type QueryTasksInput = {
  projectSlug?: string;
  titleContains?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  limit?: number;
};

type RescheduleTasksInput = {
  assignments: { taskId: string; scheduledDate: string }[];
  summary?: string;
};

type CreateTaskInput = {
  tasks: { title: string; scheduledDate?: string; projectSlug?: string; priority?: number }[];
  summary?: string;
};

type CompleteTaskInput = { taskIds: string[]; summary?: string };

type ParkInAbyssInput = {
  title?: string;
  type?: "idea" | "task";
  category?: string;
  note?: string;
};

type QueryProjectsInput = { slugContains?: string };
type QueryAbyssInput = { query?: string; limit?: number };
type ProposeAboutMeEditToolInput = { proposals?: unknown[] };

export type ChatToolResult = {
  content: string;
  mutatedTasks: boolean;
  proposal?: ProposedAction;
};

async function parkInAbyss(userId: string, input: ParkInAbyssInput) {
  const title = input.title?.trim();
  if (!title) return { ok: false as const, error: "title is required" };

  const category =
    input.category && (PROJECT_CATEGORIES as readonly string[]).includes(input.category)
      ? (input.category as ProjectCategory)
      : null;

  const now = new Date();
  const [row] = await db
    .insert(abyssItems)
    .values({
      userId,
      title: title.slice(0, 200),
      type: input.type === "task" ? "task" : "idea",
      category,
      note: input.note?.trim() || null,
      source: "capture",
      lastTouchedAt: now,
    })
    .returning();

  if (!row) return { ok: false as const, error: "failed to park item" };
  await syncAbyssItemRow(row.id, "insert", row);
  return { ok: true as const, id: row.id, title: row.title, type: row.type };
}

async function queryTasks(userId: string, input: QueryTasksInput) {
  if (input.scheduledFrom && !ISO_DATE.test(input.scheduledFrom)) {
    return { ok: false as const, error: "scheduledFrom must be YYYY-MM-DD" };
  }
  if (input.scheduledTo && !ISO_DATE.test(input.scheduledTo)) {
    return { ok: false as const, error: "scheduledTo must be YYYY-MM-DD" };
  }

  const projectRows = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(eq(projects.userId, userId));

  let projectId: string | null = null;
  if (input.projectSlug?.trim()) {
    const match = findProjectBySlug(input.projectSlug.trim(), projectRows);
    if (!match) {
      return {
        ok: false as const,
        error: `No project found for slug "${input.projectSlug}".`,
        knownSlugs: projectRows.map((p) => p.slug),
      };
    }
    projectId = projectRows.find((p) => p.slug === match.slug)?.id ?? null;
  }

  const conditions = [eq(tasks.userId, userId), isNull(tasks.completedAt)];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (input.scheduledFrom) conditions.push(gte(tasks.scheduledDate, input.scheduledFrom));
  if (input.scheduledTo) conditions.push(lte(tasks.scheduledDate, input.scheduledTo));
  if (input.titleContains?.trim()) {
    conditions.push(ilike(tasks.title, `%${input.titleContains.trim()}%`));
  }

  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      scheduledDate: tasks.scheduledDate,
      priority: tasks.priority,
      projectSlug: projects.slug,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(...conditions))
    .limit(limit);

  return {
    ok: true as const,
    count: rows.length,
    tasks: rows.map((t) => ({
      id: t.id,
      title: t.title,
      scheduledDate: t.scheduledDate,
      priority: t.priority,
      projectSlug: t.projectSlug,
    })),
  };
}

async function queryProjects(userId: string, input: QueryProjectsInput) {
  const rows = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(projects.name);

  const needle = input.slugContains?.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((p) => p.slug.includes(needle) || p.name.toLowerCase().includes(needle))
    : rows;

  const counts = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.completedAt)));

  const countByProject = new Map<string, number>();
  for (const row of counts) {
    if (!row.projectId) continue;
    countByProject.set(row.projectId, (countByProject.get(row.projectId) ?? 0) + 1);
  }

  return {
    ok: true as const,
    count: filtered.length,
    projects: filtered.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      openTasks: countByProject.get(p.id) ?? 0,
    })),
  };
}

async function queryAbyss(userId: string, input: QueryAbyssInput) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const conditions = [eq(abyssItems.userId, userId), ne(abyssItems.status, "archived")];
  if (input.query?.trim()) {
    conditions.push(ilike(abyssItems.title, `%${input.query.trim()}%`));
  }

  const rows = await db
    .select({
      id: abyssItems.id,
      title: abyssItems.title,
      type: abyssItems.type,
      category: abyssItems.category,
      lastTouchedAt: abyssItems.lastTouchedAt,
    })
    .from(abyssItems)
    .where(and(...conditions))
    .orderBy(desc(abyssItems.lastTouchedAt))
    .limit(limit);

  return { ok: true as const, count: rows.length, items: rows };
}

async function buildRescheduleProposal(
  userId: string,
  input: RescheduleTasksInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  if (!input.assignments?.length) return { ok: false, error: "assignments array is required" };
  for (const row of input.assignments) {
    if (!ISO_DATE.test(row.scheduledDate)) {
      return { ok: false, error: "scheduledDate must be YYYY-MM-DD" };
    }
  }

  const titleById = await resolveOwnedTaskTitles(
    userId,
    input.assignments.map((a) => a.taskId)
  );
  const items = input.assignments
    .filter((a) => titleById.has(a.taskId))
    .map((a) => ({
      itemId: newProposalItemId(),
      enabled: true,
      taskId: a.taskId,
      title: titleById.get(a.taskId) ?? "Task",
      scheduledDate: a.scheduledDate,
    }));

  if (items.length === 0) return { ok: false, error: "No owned tasks matched the assignment IDs." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "reschedule_tasks",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

async function buildCreateTaskProposal(
  input: CreateTaskInput
): Promise<{ ok: true; proposal: ProposedAction } | { ok: false; error: string }> {
  const rows = input.tasks?.filter((t) => t.title?.trim()) ?? [];
  if (rows.length === 0) return { ok: false, error: "tasks array is required" };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "create_task",
      status: "pending",
      summary: input.summary,
      items: rows.map((t) => ({
        itemId: newProposalItemId(),
        enabled: true,
        title: t.title.trim(),
        scheduledDate: t.scheduledDate && ISO_DATE.test(t.scheduledDate) ? t.scheduledDate : null,
        projectSlug: t.projectSlug ?? null,
        priority: t.priority,
      })),
    }),
  };
}

async function buildCompleteTaskProposal(
  userId: string,
  input: CompleteTaskInput
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

  if (items.length === 0) return { ok: false, error: "No owned incomplete tasks matched the IDs." };

  return {
    ok: true,
    proposal: proposedActionSchema.parse({
      kind: "complete_task",
      status: "pending",
      summary: input.summary,
      items,
    }),
  };
}

function isSilentWriteTool(register: KashRegister, name: string): boolean {
  return register === "focus" && (name === "complete_task" || name === "park_in_abyss");
}

export async function executeChatTool(
  userId: string,
  name: string,
  input: unknown,
  options?: { register?: KashRegister; threadId?: string }
): Promise<ChatToolResult> {
  const register = options?.register ?? "planning";

  try {
    if (name === "query_tasks") {
      const result = await queryTasks(userId, (input ?? {}) as QueryTasksInput);
      return { content: JSON.stringify(result), mutatedTasks: false };
    }

    if (name === "query_state") {
      const threadId = options?.threadId ?? "global";
      const { contextBlock } = await assembleChatContext(userId, threadId);
      return { content: JSON.stringify({ ok: true, state: contextBlock }), mutatedTasks: false };
    }

    if (name === "query_projects") {
      const result = await queryProjects(userId, (input ?? {}) as QueryProjectsInput);
      return { content: JSON.stringify(result), mutatedTasks: false };
    }

    if (name === "query_abyss") {
      const result = await queryAbyss(userId, (input ?? {}) as QueryAbyssInput);
      return { content: JSON.stringify(result), mutatedTasks: false };
    }

    if (name === "draft_week" || name === "draft_eod" || name === "draft_balance_pass") {
      return {
        content: JSON.stringify({
          ok: true,
          draft: name,
          note: "Draft only — describe the proposal in your reply.",
        }),
        mutatedTasks: false,
      };
    }

    if (name === "reschedule_tasks") {
      const built = await buildRescheduleProposal(userId, input as RescheduleTasksInput);
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      if (isSilentWriteTool(register, name)) {
        const applied = await applyProposedActionPayload(userId, built.proposal);
        return {
          content: JSON.stringify({ ok: true, applied: applied.applied, tasks: applied.titles }),
          mutatedTasks: applied.applied > 0,
        };
      }
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "create_task") {
      const built = await buildCreateTaskProposal(input as CreateTaskInput);
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "edit_task") {
      const built = await buildEditTaskProposal(
        userId,
        input as Parameters<typeof buildEditTaskProposal>[1]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "delete_task") {
      const built = await buildDeleteTaskProposal(
        userId,
        input as { taskIds?: string[]; summary?: string }
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "complete_task") {
      const built = await buildCompleteTaskProposal(userId, input as CompleteTaskInput);
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      if (isSilentWriteTool(register, name)) {
        const applied = await applyProposedActionPayload(userId, built.proposal);
        return {
          content: JSON.stringify({ ok: true, applied: applied.applied, tasks: applied.titles }),
          mutatedTasks: applied.applied > 0,
        };
      }
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "set_top3") {
      const built = await buildSetTop3Proposal(
        userId,
        input as { slots?: { taskId?: string; slot?: number }[]; summary?: string }
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "set_protected_block") {
      const built = buildSetProtectedBlockProposal(
        input as Parameters<typeof buildSetProtectedBlockProposal>[0]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "set_day_priorities") {
      const built = await buildSetDayPrioritiesProposal(
        userId,
        input as Parameters<typeof buildSetDayPrioritiesProposal>[1]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "apply_balance_suggestions") {
      const built = buildApplyBalanceSuggestionsProposal(
        input as Parameters<typeof buildApplyBalanceSuggestionsProposal>[0]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "create_project") {
      const built = buildCreateProjectProposal(
        input as Parameters<typeof buildCreateProjectProposal>[0]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "edit_phase") {
      const built = await buildEditPhaseProposal(
        userId,
        input as Parameters<typeof buildEditPhaseProposal>[1]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "move_task_to_phase") {
      const built = await buildMoveTaskToPhaseProposal(
        userId,
        input as Parameters<typeof buildMoveTaskToPhaseProposal>[1]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "replan_project_dates") {
      const built = await buildReplanProjectDatesProposal(
        userId,
        input as Parameters<typeof buildReplanProjectDatesProposal>[1]
      );
      if (!built.ok)
        return { content: JSON.stringify({ ok: false, error: built.error }), mutatedTasks: false };
      return {
        content: JSON.stringify({ ok: true, proposed: true, action: built.proposal }),
        mutatedTasks: false,
        proposal: built.proposal,
      };
    }

    if (name === "propose_about_me_edit") {
      const parsed = input as ProposeAboutMeEditToolInput;
      const rawProposals = Array.isArray(parsed?.proposals) ? parsed.proposals : [];
      if (!rawProposals.length) {
        return {
          content: JSON.stringify({ ok: false, error: "proposals array is required" }),
          mutatedTasks: false,
        };
      }
      const proposals = rawProposals
        .map((item) => {
          const raw = (item ?? {}) as Record<string, unknown>;
          if (raw.constraintType != null && raw.type == null) raw.type = raw.constraintType;
          return normalizeChatToolProposal(raw as Parameters<typeof normalizeChatToolProposal>[0]);
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
      if (!proposals.length) {
        return {
          content: JSON.stringify({ ok: false, error: "No valid proposals." }),
          mutatedTasks: false,
        };
      }
      const result = await proposeAboutMeEdit(userId, proposals);
      return {
        content: JSON.stringify({ ok: true, created: result.created, skipped: result.skipped }),
        mutatedTasks: false,
      };
    }

    if (name === "park_in_abyss") {
      const result = await parkInAbyss(userId, (input ?? {}) as ParkInAbyssInput);
      return { content: JSON.stringify(result), mutatedTasks: false };
    }

    return {
      content: JSON.stringify({ ok: false, error: `Unknown tool: ${name}` }),
      mutatedTasks: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed.";
    return { content: JSON.stringify({ ok: false, error: message }), mutatedTasks: false };
  }
}
