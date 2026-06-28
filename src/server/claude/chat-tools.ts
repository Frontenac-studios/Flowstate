import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, gte, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { syncAbyssItemRow } from "@/db/record-sync-mutation";
import { abyssItems, projects, tasks } from "@/db/tables";
import { findProjectBySlug } from "@/lib/parser/fuzzy-project";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { applyScheduleBatch } from "@/server/tasks/apply-schedule-batch";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_tasks",
    description:
      "Find incomplete tasks, optionally filtered by project slug and/or scheduled date range (inclusive). Use before rescheduling when the user mentions a project or date window.",
    input_schema: {
      type: "object",
      properties: {
        projectSlug: {
          type: "string",
          description: "Project slug without #, e.g. frontenac-studios-launch",
        },
        scheduledFrom: {
          type: "string",
          description: "Inclusive lower bound YYYY-MM-DD on scheduledDate",
        },
        scheduledTo: {
          type: "string",
          description: "Inclusive upper bound YYYY-MM-DD on scheduledDate",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "reschedule_tasks",
    description:
      "Assign new scheduled dates to one or more tasks. Each task moves to the given ISO date; clears bucket overrides.",
    input_schema: {
      type: "object",
      properties: {
        assignments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "Task UUID from context or query_tasks" },
              scheduledDate: { type: "string", description: "New date YYYY-MM-DD" },
            },
            required: ["taskId", "scheduledDate"],
          },
        },
      },
      required: ["assignments"],
      additionalProperties: false,
    },
  },
  {
    name: "park_in_abyss",
    description:
      "Park a backburner idea or deferred task in the Abyss (a tended home for things to revisit later, not now). Use when the user says to 'park', 'shelve', 'someday', 'backburner', or 'save for later'. Not for actionable tasks they want scheduled — use reschedule_tasks for those.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title of the idea or task to park" },
        type: {
          type: "string",
          enum: ["idea", "task"],
          description: "'idea' (default) for a thought; 'task' for a concrete deferred to-do",
        },
        category: {
          type: "string",
          enum: [...PROJECT_CATEGORIES],
          description: "Optional life-area category if clear from context",
        },
        note: { type: "string", description: "Optional extra detail" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
];

type QueryTasksInput = {
  projectSlug?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
};

type RescheduleTasksInput = {
  assignments: { taskId: string; scheduledDate: string }[];
};

type ParkInAbyssInput = {
  title?: string;
  type?: "idea" | "task";
  category?: string;
  note?: string;
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

  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId));
  }
  if (input.scheduledFrom) {
    conditions.push(gte(tasks.scheduledDate, input.scheduledFrom));
  }
  if (input.scheduledTo) {
    conditions.push(lte(tasks.scheduledDate, input.scheduledTo));
  }

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
    .where(and(...conditions));

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

export type ChatToolResult = {
  content: string;
  mutatedTasks: boolean;
};

export async function executeChatTool(
  userId: string,
  name: string,
  input: unknown
): Promise<ChatToolResult> {
  try {
    if (name === "query_tasks") {
      const result = await queryTasks(userId, (input ?? {}) as QueryTasksInput);
      return { content: JSON.stringify(result), mutatedTasks: false };
    }

    if (name === "reschedule_tasks") {
      const parsed = input as RescheduleTasksInput;
      if (!parsed?.assignments?.length) {
        return {
          content: JSON.stringify({ ok: false, error: "assignments array is required" }),
          mutatedTasks: false,
        };
      }

      const { applied, titles } = await applyScheduleBatch(userId, parsed.assignments);
      return {
        content: JSON.stringify({
          ok: true,
          applied,
          tasks: titles,
        }),
        mutatedTasks: applied > 0,
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
    return {
      content: JSON.stringify({ ok: false, error: message }),
      mutatedTasks: false,
    };
  }
}
