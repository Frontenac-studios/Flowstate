import { and, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { abyssItems, clients, projects, tasks } from "@/db/tables";
import { rankResults, type RankableResult, type SearchKind } from "@/lib/search/rank-results";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * One search procedure, four call sites (W17e).
 *
 * The capture panel, the ⌘K palette, the Backlog filter and the project filter
 * all ask the same question — "where is the thing I'm thinking of" — so they ask
 * it in one place. What differs between them is scope and presentation, which is
 * what `kinds` and `projectId` are for.
 *
 * Matching is `LIKE` over lowered text rather than a full-text index. At one
 * user with a dozen projects that is the correct amount of machinery; a tsvector
 * column plus its triggers would be the 20-hours-to-save-15-minutes trade
 * MISSION explicitly rules out. Revisit when a query gets slow, not before.
 *
 * `lower(x) LIKE lower(y)` rather than `ILIKE` on purpose: the desktop build
 * runs the same queries against SQLite, which has no `ILIKE`.
 */

const kindSchema = z.enum(["task", "backlog", "project", "client"]);

/** Per-kind ceiling before ranking. Generous enough that ranking, not SQL, decides the order. */
const PER_KIND_LIMIT = 25;

/** `%` and `_` are wildcards in LIKE, so a query containing them must be escaped or it matches everything. */
function likePattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped.toLowerCase()}%`;
}

function matches(column: unknown, pattern: string) {
  return sql`lower(${column}) like ${pattern} escape '\\'`;
}

/** A short piece of the body text around the match, so a note hit explains itself. */
function snippetAround(body: string | null, query: string): string | null {
  if (!body) return null;
  const at = body.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return body.slice(0, 90);
  const start = Math.max(0, at - 30);
  const text = body.slice(start, start + 90).trim();
  return `${start > 0 ? "…" : ""}${text}${start + 90 < body.length ? "…" : ""}`;
}

export type SearchResult = RankableResult & {
  kind: SearchKind;
  /** Where selecting this row takes you. */
  href: string;
  /** "Great White", "Backlog", "Completed" — the one line of orientation a row gets. */
  context: string | null;
};

export const searchRouter = createTRPCRouter({
  /**
   * Everything matching `q`, ranked, across tasks, Backlog items, projects and
   * clients. An empty query returns nothing rather than everything: search is
   * for finding a known thing, and browsing has its own surfaces.
   */
  query: protectedProcedure
    .input(
      z.object({
        q: z.string().trim().max(120),
        limit: z.number().int().min(1).max(50).default(12),
        /** Restrict to some kinds. Omitted means all four. */
        kinds: z.array(kindSchema).min(1).optional(),
        /** Scope task results to one project, for the project-detail filter. */
        projectId: z.string().uuid().optional(),
        /** The Backlog and project filters want live rows only. */
        includeCompleted: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }): Promise<SearchResult[]> => {
      const q = input.q.trim();
      if (!q) return [];

      const pattern = likePattern(q);
      const wanted = new Set<SearchKind>(input.kinds ?? ["task", "backlog", "project", "client"]);
      // A project-scoped search is a filter inside one project, so the other
      // kinds are noise by definition.
      const kinds = input.projectId ? new Set<SearchKind>(["task"]) : wanted;

      const taskRows = kinds.has("task")
        ? await db
            .select({
              id: tasks.id,
              title: tasks.title,
              projectId: tasks.projectId,
              completedAt: tasks.completedAt,
              updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, ctx.userId),
                matches(tasks.title, pattern),
                input.projectId ? eq(tasks.projectId, input.projectId) : undefined,
                input.includeCompleted ? undefined : isNull(tasks.completedAt)
              )
            )
            .limit(PER_KIND_LIMIT)
        : [];

      const backlogRows = kinds.has("backlog")
        ? await db
            .select({
              id: abyssItems.id,
              title: abyssItems.title,
              note: abyssItems.note,
              status: abyssItems.status,
              updatedAt: abyssItems.lastTouchedAt,
            })
            .from(abyssItems)
            .where(
              and(
                eq(abyssItems.userId, ctx.userId),
                or(matches(abyssItems.title, pattern), matches(abyssItems.note, pattern))
              )
            )
            .limit(PER_KIND_LIMIT)
        : [];

      const projectRows = kinds.has("project")
        ? await db
            .select({
              id: projects.id,
              name: projects.name,
              archivedAt: projects.archivedAt,
              updatedAt: projects.updatedAt,
            })
            .from(projects)
            .where(and(eq(projects.userId, ctx.userId), matches(projects.name, pattern)))
            .limit(PER_KIND_LIMIT)
        : [];

      const clientRows = kinds.has("client")
        ? await db
            .select({
              id: clients.id,
              name: clients.name,
              notes: clients.notes,
              archivedAt: clients.archivedAt,
              updatedAt: clients.updatedAt,
            })
            .from(clients)
            .where(
              and(
                eq(clients.userId, ctx.userId),
                or(matches(clients.name, pattern), matches(clients.notes, pattern))
              )
            )
            .limit(PER_KIND_LIMIT)
        : [];

      // Project names for task context, resolved in one pass rather than per row.
      const projectNames = new Map<string, string>();
      const needed = taskRows.map((t) => t.projectId).filter((id): id is string => Boolean(id));
      if (needed.length > 0) {
        const rows = await db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(eq(projects.userId, ctx.userId));
        for (const row of rows) projectNames.set(row.id, row.name);
      }

      const results: SearchResult[] = [
        ...taskRows.map((row) => ({
          id: row.id,
          kind: "task" as const,
          title: row.title,
          snippet: null,
          matchField: "title" as const,
          done: row.completedAt !== null,
          updatedAt: row.updatedAt,
          href: row.projectId
            ? `/projects/${row.projectId}?focus=${row.id}`
            : `/today?focus=${row.id}`,
          context: row.completedAt
            ? "Completed"
            : row.projectId
              ? (projectNames.get(row.projectId) ?? null)
              : "Loose task",
        })),
        ...backlogRows.map((row) => {
          const inTitle = row.title.toLowerCase().includes(q.toLowerCase());
          return {
            id: row.id,
            kind: "backlog" as const,
            title: row.title,
            snippet: inTitle ? null : snippetAround(row.note, q),
            matchField: (inTitle ? "title" : "body") as "title" | "body",
            done: row.status === "archived",
            updatedAt: row.updatedAt,
            href: `/backlog?focus=${row.id}`,
            context: row.status === "archived" ? "Backlog · archived" : "Backlog",
          };
        }),
        ...projectRows.map((row) => ({
          id: row.id,
          kind: "project" as const,
          title: row.name,
          snippet: null,
          matchField: "title" as const,
          done: row.archivedAt !== null,
          updatedAt: row.updatedAt,
          href: `/projects/${row.id}`,
          context: row.archivedAt ? "Project · archived" : "Project",
        })),
        ...clientRows.map((row) => {
          const inName = row.name.toLowerCase().includes(q.toLowerCase());
          return {
            id: row.id,
            kind: "client" as const,
            title: row.name,
            snippet: inName ? null : snippetAround(row.notes, q),
            matchField: (inName ? "title" : "body") as "title" | "body",
            done: row.archivedAt !== null,
            updatedAt: row.updatedAt,
            href: `/clients/${row.id}`,
            context: row.archivedAt ? "Client · archived" : "Client",
          };
        }),
      ];

      return rankResults(results, q, input.limit);
    }),
});
