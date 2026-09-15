import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { registerReadTools } from "@/server/mcp/read-tools";
import { verifyMcpToken } from "@/server/mcp/verify-token";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The MCP endpoint (docs/plan-w18-mcp-endpoint.md). Claude Desktop reads Flowstate
 * through it, authenticated by a personal access token minted in Settings →
 * Integrations → Claude (W18b). The tools are read-only (W18c); the ingest —
 * draft, approve, apply — is W18d–e.
 *
 * Serving is stateless (mcp-handler 2.x: no sessions, no Redis), which is what a
 * serverless function needs — any instance can answer any request.
 */
const mcp = createMcpHandler(
  (server) => {
    registerReadTools(server);
  },
  { serverInfo: { name: "flowstate", version: "0.2.0-w18c" } }
);

const authenticated = withMcpAuth(mcp, (_req, bearer) => verifyMcpToken(bearer), {
  required: true,
});

/**
 * A request with no Authorization header at all gets a plain 404, the same as any
 * other unknown path, so a scanner probing for MCP servers learns nothing. A client
 * that does present a bearer — even a wrong one — gets the 401 it can act on.
 */
function handler(req: Request): Promise<Response> | Response {
  if (!req.headers.get("authorization")) return new Response(null, { status: 404 });
  return authenticated(req);
}

export { handler as GET, handler as POST };
