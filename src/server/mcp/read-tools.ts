import "server-only";

import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { ensureOrgForUser } from "@/server/orgs/ensure-org-for-user";
import { createCallerFactory } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

import {
  clientNameMap,
  matchProject,
  shapeBurn,
  shapeClients,
  shapeOpenTasks,
  shapeProjectList,
  shapeProjectTree,
} from "./shape";
import { mcpUserId } from "./verify-token";

/**
 * The five read tools (W18c, docs/plan-w18-mcp-endpoint.md §6).
 *
 * Every tool calls the existing tRPC router through `createCaller`, as the token's
 * user — the same procedures, ownership checks and queries the app itself uses. No
 * business logic is reimplemented here; this file only adapts arguments in and
 * shapes answers out (./shape.ts).
 *
 * Deliberately few tools, each returning enough context to reason from without a
 * second call. None of them writes anything.
 */
const createCaller = createCallerFactory(appRouter);
type Caller = ReturnType<typeof createCaller>;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 1) }],
});

const refuse = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .describe("A calendar date, YYYY-MM-DD.");

const projectRef = z
  .string()
  .min(1)
  .describe(
    "The project's id, its exact name, or a fragment of the name that matches only one project."
  );

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

/** Build a tRPC caller acting as the token's user, then run `fn` with it. */
async function asTokenUser(
  tool: string,
  authInfo: AuthInfo | undefined,
  fn: (caller: Caller) => Promise<ToolResult>
): Promise<ToolResult> {
  const userId = mcpUserId(authInfo);
  if (!userId) return refuse("Not authenticated.");
  if (!authInfo?.scopes.includes("read")) {
    return refuse(
      "This token doesn't have the `read` scope. Create a new token in Flowstate Settings."
    );
  }
  try {
    const org = await ensureOrgForUser(db, userId);
    const caller = createCaller({ userId, email: null, orgId: org.orgId, role: org.role });
    return await fn(caller);
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      return refuse(error.message);
    }
    console.error(`[mcp] ${tool} failed`, error instanceof Error ? error.message : "");
    return refuse("Flowstate couldn't answer that just now. Try again in a moment.");
  }
}

/** Turn a project reference into an id, or a refusal Claude can act on. */
async function resolveProject(
  caller: Caller,
  ref: string
): Promise<{ id: string } | { refusal: ToolResult }> {
  const projects = await caller.projects.list();
  const match = matchProject(ref, projects);
  if (match.kind === "found") return { id: match.id };
  if (match.kind === "none") {
    return { refusal: refuse(`No project matches "${ref}". Call list_projects to see them all.`) };
  }
  const names = match.candidates.map((c) => `${c.name} (${c.id})`).join("; ");
  return { refusal: refuse(`"${ref}" matches more than one project: ${names}. Pass the id.`) };
}

export function registerReadTools(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "Every project that isn't archived: its client, state (prospect / active / paused / " +
        "done), billing type, progress, task counts, next due date and hours logged. Start " +
        "here to find a project; the other tools accept its name or id. Read-only.",
      inputSchema: z.object({
        state: z
          .enum(["prospect", "active", "paused", "done"])
          .optional()
          .describe("Only projects in this state. Omit for all."),
      }),
      annotations: READ_ONLY,
    },
    async ({ state }, ctx) =>
      asTokenUser("list_projects", ctx.http?.authInfo, async (caller) => {
        const [projects, clients] = await Promise.all([
          caller.projects.list(),
          caller.clients.list(),
        ]);
        const filtered = state ? projects.filter((p) => p.state === state) : projects;
        return ok(shapeProjectList(filtered, clients));
      })
  );

  server.registerTool(
    "get_project",
    {
      title: "Get a project",
      description:
        "One project in full: its phases (nested, with start/end dates and hour estimates), " +
        "every task under each phase with due date, priority and whether it's done, and tasks " +
        "that sit outside any phase. Use this before describing or planning changes to a " +
        "project. Read-only.",
      inputSchema: z.object({ project: projectRef }),
      annotations: READ_ONLY,
    },
    async ({ project }, ctx) =>
      asTokenUser("get_project", ctx.http?.authInfo, async (caller) => {
        const resolved = await resolveProject(caller, project);
        if ("refusal" in resolved) return resolved.refusal;
        const [row, phases, tasks, clients] = await Promise.all([
          caller.projects.getById({ id: resolved.id }),
          caller.phases.listByProject({ projectId: resolved.id }),
          caller.tasks.listByProject({ projectId: resolved.id }),
          caller.clients.list({ includeArchived: true }),
        ]);
        const clientName = row.clientId ? (clientNameMap(clients).get(row.clientId) ?? null) : null;
        return ok(shapeProjectTree(row, phases, tasks, clientName));
      })
  );

  server.registerTool(
    "list_clients",
    {
      title: "List clients",
      description:
        "Active clients with their currency, current default hourly rate (in currency units, " +
        "not cents), billing threshold in hours, and any notes. Read-only.",
      inputSchema: z.object({
        include_archived: z.boolean().optional().describe("Also list archived clients."),
      }),
      annotations: READ_ONLY,
    },
    async ({ include_archived }, ctx) =>
      asTokenUser("list_clients", ctx.http?.authInfo, async (caller) => {
        const clients = await caller.clients.list({ includeArchived: include_archived ?? false });
        return ok(shapeClients(clients));
      })
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List open tasks",
      description:
        "Tasks that aren't done yet, with due date, priority, project and phase. Filter by " +
        "project and by an inclusive date range. Flowstate never guesses today's date: pass " +
        "the dates you mean as YYYY-MM-DD (e.g. from and to for 'this week'). With a date " +
        "range, undated tasks are left out unless include_unscheduled is true. Read-only.",
      inputSchema: z.object({
        project: projectRef.optional(),
        from: isoDate.optional(),
        to: isoDate.optional(),
        include_unscheduled: z.boolean().optional(),
        limit: z.number().int().min(1).max(300).optional().describe("Default 100."),
      }),
      annotations: READ_ONLY,
    },
    async ({ project, from, to, include_unscheduled, limit }, ctx) =>
      asTokenUser("list_tasks", ctx.http?.authInfo, async (caller) => {
        if (from && to && from > to) return refuse("`from` is after `to`.");
        let projectId: string | undefined;
        if (project) {
          const resolved = await resolveProject(caller, project);
          if ("refusal" in resolved) return resolved.refusal;
          projectId = resolved.id;
        }
        const tasks = await caller.tasks.listIncomplete();
        return ok(
          shapeOpenTasks(tasks, {
            projectId,
            from,
            to,
            includeUnscheduled: include_unscheduled,
            limit: limit ?? 100,
          })
        );
      })
  );

  server.registerTool(
    "get_burn",
    {
      title: "Get budget burn",
      description:
        "Estimate vs actual, per project and per phase: hours estimated and logged, how much " +
        "of the estimate is consumed, how much of the work is done, and whether the budget is " +
        "running ahead of the work ('hot'). For fixed-fee work, the effective hourly rate " +
        "against the floor. Omit project for every project. Read-only.",
      inputSchema: z.object({ project: projectRef.optional() }),
      annotations: READ_ONLY,
    },
    async ({ project }, ctx) =>
      asTokenUser("get_burn", ctx.http?.authInfo, async (caller) => {
        let projectId: string | undefined;
        if (project) {
          const resolved = await resolveProject(caller, project);
          if ("refusal" in resolved) return resolved.refusal;
          projectId = resolved.id;
        }
        const rows = await caller.projects.burn(projectId ? { projectId } : undefined);
        return ok(shapeBurn(rows));
      })
  );
}
