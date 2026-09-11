// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/mcp/route";

const TOKEN = "fs_pat_route_gate_test_token_value_0123456789";
const URL = "http://localhost/api/mcp";
const INIT = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "route-gate-test", version: "0" },
  },
});

function mcpRequest(init: { bearer?: string; method?: string } = {}): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (init.bearer) headers.Authorization = `Bearer ${init.bearer}`;
  const method = init.method ?? "POST";
  return new Request(URL, { method, headers, body: method === "POST" ? INIT : undefined });
}

describe("/api/mcp", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.MCP_SPIKE_TOKEN;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.MCP_SPIKE_TOKEN;
    else process.env.MCP_SPIKE_TOKEN = saved;
  });

  describe("with no token configured — production today", () => {
    beforeEach(() => {
      delete process.env.MCP_SPIKE_TOKEN;
    });

    it("does not exist: 404 rather than a 401 that would advertise it", async () => {
      expect((await POST(mcpRequest())).status).toBe(404);
      expect((await GET(mcpRequest({ method: "GET" }))).status).toBe(404);
    });

    it("stays a 404 even when a bearer is presented", async () => {
      expect((await POST(mcpRequest({ bearer: TOKEN }))).status).toBe(404);
    });
  });

  describe("with a token configured", () => {
    beforeEach(() => {
      process.env.MCP_SPIKE_TOKEN = TOKEN;
    });

    it("refuses a request with no bearer", async () => {
      const res = await POST(mcpRequest());
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toMatch(/^Bearer /);
    });

    it("refuses a wrong bearer", async () => {
      expect((await POST(mcpRequest({ bearer: "fs_pat_wrong" }))).status).toBe(401);
    });

    it("completes the MCP handshake with the right bearer", async () => {
      const res = await POST(mcpRequest({ bearer: TOKEN }));
      expect(res.status).toBe(200);

      const body = await res.text();
      const json = body.startsWith("{") ? body : body.replace(/^[\s\S]*?data: /, "").split("\n")[0];
      const { result } = JSON.parse(json ?? "{}") as {
        result: { serverInfo: { name: string }; capabilities: Record<string, unknown> };
      };
      expect(result.serverInfo.name).toBe("flowstate");
      expect(result.capabilities).toHaveProperty("tools");
    });
  });
});
