import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { verifySpikeToken } from "@/server/mcp/spike-token";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * W18a — the MCP transport spike (docs/plan-w18-mcp-endpoint.md §9).
 *
 * One tool, no data. It proves the path Claude Desktop → this route → an
 * authenticated response, and nothing else: whether Claude can reach a Vercel
 * function over Streamable HTTP, and whether it can present a bearer token when it
 * does. W18b replaces the credential check; W18c adds the read tools over
 * `createCaller`. Until then, `ping` deliberately touches no user data — so a
 * mistake here cannot leak anything.
 *
 * Serving is stateless (mcp-handler 2.x: no sessions, no Redis), which is what a
 * serverless function needs — any instance can answer any request.
 */
const mcp = createMcpHandler(
  (server) => {
    server.registerTool(
      "ping",
      {
        title: "Ping Flowstate",
        description:
          "Confirms that Claude can reach Flowstate and is authenticated. It reads no " +
          "data and changes nothing — it only reports that the connection works.",
      },
      async () => ({
        content: [
          {
            type: "text",
            text: `Connected to Flowstate. Authenticated. Server time ${new Date().toISOString()}.`,
          },
        ],
      })
    );
  },
  { serverInfo: { name: "flowstate", version: "0.1.0-w18a" } }
);

const authenticated = withMcpAuth(mcp, (_req, bearer) => verifySpikeToken(bearer), {
  required: true,
});

/**
 * The endpoint does not exist until a token is configured. Without this gate the
 * route would answer every probe with a 401 — which confirms to anyone scanning that
 * an MCP server lives here. With no MCP_SPIKE_TOKEN set (production, today), it is a
 * plain 404, the same as any other path.
 */
function handler(req: Request): Promise<Response> | Response {
  if (!process.env.MCP_SPIKE_TOKEN) return new Response(null, { status: 404 });
  return authenticated(req);
}

export { handler as GET, handler as POST };
