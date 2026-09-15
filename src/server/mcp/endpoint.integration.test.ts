// @vitest-environment node
import { randomUUID } from "node:crypto";

import { clients, mcpTokens, phases, projects, tasks } from "@kash/db-local/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mintMcpToken } from "@/lib/mcp/token";

/**
 * /api/mcp end to end (W18b–c): the real route, the real token lookup, the real tRPC
 * procedures, against an in-memory SQLite database. Only the database handle is
 * swapped; nothing about auth or the tools is mocked.
 */
const USER = randomUUID();
const OTHER_USER = randomUUID();
const ORG = randomUUID();
const CLIENT = randomUUID();
const PROJECT = randomUUID();
const OTHER_PROJECT = randomUUID();
const PHASE = randomUUID();

const live = mintMcpToken();
const revoked = mintMcpToken();
const expired = mintMcpToken();

let db: Awaited<ReturnType<typeof seed>>;

async function seed() {
  const { createSqliteDb } = await import("@kash/db-local");
  const { db } = createSqliteDb(":memory:");
  const now = new Date();
  const token = (minted: typeof live, over: Partial<typeof mcpTokens.$inferInsert> = {}) => ({
    id: randomUUID(),
    userId: USER,
    orgId: ORG,
    name: "Claude Desktop",
    tokenHash: minted.tokenHash,
    tokenPrefix: minted.tokenPrefix,
    scopes: ["read"],
    ...over,
  });
  db.insert(mcpTokens)
    .values([
      token(live),
      token(revoked, { revokedAt: now }),
      token(expired, { expiresAt: new Date(now.getTime() - 1000) }),
    ])
    .run();
  db.insert(clients).values({ id: CLIENT, userId: USER, orgId: ORG, name: "Great White" }).run();
  db.insert(projects)
    .values([
      {
        id: PROJECT,
        userId: USER,
        name: "Dashboards",
        slug: "dashboards",
        category: "business",
        clientId: CLIENT,
        state: "active",
      },
      // Another user's project — must never appear.
      {
        id: OTHER_PROJECT,
        userId: OTHER_USER,
        name: "Not yours",
        slug: "not-yours",
        category: "business",
      },
    ])
    .run();
  db.insert(phases)
    .values({ id: PHASE, userId: USER, projectId: PROJECT, name: "Build", estimateHours: 12 })
    .run();
  db.insert(tasks)
    .values([
      {
        userId: USER,
        projectId: PROJECT,
        phaseId: PHASE,
        title: "Wire the revenue chart",
        category: "business",
        scheduledDate: "2026-09-16",
        priority: 3,
      },
      { userId: USER, projectId: PROJECT, title: "Send kickoff notes", category: "business" },
    ])
    .run();
  return db;
}

let nextId = 1;
async function rpc(
  route: { POST: (req: Request) => Promise<Response> | Response },
  bearer: string | null,
  method: string,
  params: unknown = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (bearer !== null) headers.Authorization = `Bearer ${bearer}`;
  const res = await route.POST(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    })
  );
  const text = await res.text();
  const json = text.startsWith("{")
    ? text
    : (text.replace(/^[\s\S]*?data: /, "").split("\n")[0] ?? "");
  return { status: res.status, headers: res.headers, body: json ? JSON.parse(json) : null };
}

async function callTool(
  route: Parameters<typeof rpc>[0],
  name: string,
  args: Record<string, unknown> = {}
) {
  const { body } = await rpc(route, live.token, "tools/call", { name, arguments: args });
  const result = body.result as { content: { text: string }[]; isError?: boolean };
  return { isError: result.isError ?? false, text: result.content[0]!.text };
}

describe("/api/mcp (sqlite)", () => {
  let route: typeof import("@/app/api/mcp/route");

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_MODE", "sqlite");
    db = await seed();
    vi.doMock("@/db", () => ({ db }));
    route = await import("@/app/api/mcp/route");
  });

  describe("auth", () => {
    it("is a plain 404 without an Authorization header", async () => {
      expect((await rpc(route, null, "initialize")).status).toBe(404);
      const get = await route.GET(new Request("http://localhost/api/mcp"));
      expect(get.status).toBe(404);
    });

    it.each([
      ["a malformed bearer", "not-a-token"],
      ["an unknown token", mintMcpToken().token],
      ["a revoked token", revoked.token],
      ["an expired token", expired.token],
    ])("refuses %s with a 401 challenge", async (_label, bearer) => {
      const res = await rpc(route, bearer, "initialize");
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toMatch(/^Bearer /);
    });

    it("completes the handshake with a live token and records its use", async () => {
      const res = await rpc(route, live.token, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "endpoint-test", version: "0" },
      });
      expect(res.status).toBe(200);
      expect(res.body.result.serverInfo.name).toBe("flowstate");

      const [row] = db
        .select()
        .from(mcpTokens)
        .all()
        .filter((t) => t.tokenHash === live.tokenHash);
      expect(row!.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  it("offers exactly the five read tools, all marked read-only", async () => {
    const { body } = await rpc(route, live.token, "tools/list");
    const tools = body.result.tools as { name: string; annotations?: { readOnlyHint?: boolean } }[];
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_burn",
      "get_project",
      "list_clients",
      "list_projects",
      "list_tasks",
    ]);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("list_projects returns this user's projects with the client by name", async () => {
    const { isError, text } = await callTool(route, "list_projects");
    expect(isError).toBe(false);
    const data = JSON.parse(text);
    expect(data.projects.map((p: { name: string }) => p.name)).toEqual(["Dashboards"]);
    expect(data.projects[0]).toMatchObject({
      client: "Great White",
      state: "active",
      tasks_total: 2,
    });
  });

  it("get_project resolves a name and returns the phase tree", async () => {
    const data = JSON.parse((await callTool(route, "get_project", { project: "dashboards" })).text);
    expect(data.phases[0]).toMatchObject({ name: "Build", estimate_hours: 12 });
    expect(data.phases[0].tasks[0]).toMatchObject({
      title: "Wire the revenue chart",
      priority: "high",
    });
    expect(data.unphased_tasks.map((t: { title: string }) => t.title)).toEqual([
      "Send kickoff notes",
    ]);
  });

  it("get_project refuses another user's project as if it didn't exist", async () => {
    const res = await callTool(route, "get_project", { project: OTHER_PROJECT });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/No project matches/);
  });

  it("list_tasks honours an explicit date range", async () => {
    const data = JSON.parse(
      (await callTool(route, "list_tasks", { from: "2026-09-14", to: "2026-09-20" })).text
    );
    expect(data.tasks.map((t: { title: string }) => t.title)).toEqual(["Wire the revenue chart"]);
    expect(data.tasks[0]).toMatchObject({
      project: "Dashboards",
      phase: "Build",
      due: "2026-09-16",
    });
  });

  it("list_clients and get_burn answer without error", async () => {
    const clientsRes = JSON.parse((await callTool(route, "list_clients")).text);
    expect(clientsRes.clients.map((c: { name: string }) => c.name)).toEqual(["Great White"]);

    const burn = await callTool(route, "get_burn", { project: "Dashboards" });
    expect(burn.isError).toBe(false);
    expect(JSON.parse(burn.text).projects[0]).toMatchObject({
      project: "Dashboards",
      estimate_hours: 12,
    });
  });
});
