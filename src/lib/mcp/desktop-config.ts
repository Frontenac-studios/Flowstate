/**
 * The `claude_desktop_config.json` entry that connects Claude Desktop to Flowstate
 * (W18b). Claude Desktop runs `mcp-remote` as a local bridge and sends the token as
 * a bearer header; the token sits in `env`, not in `args`, so it never shows up in a
 * process list.
 *
 * `Authorization:${AUTH_HEADER}` has no space around the colon on purpose: a space
 * there is mangled by argument escaping on some clients.
 */
export const MCP_REMOTE_VERSION = "0.13.5";

export function claudeDesktopConfig(endpoint: string, token: string): string {
  const config = {
    mcpServers: {
      flowstate: {
        command: "npx",
        args: [
          `mcp-remote@${MCP_REMOTE_VERSION}`,
          endpoint,
          "--header",
          "Authorization:${AUTH_HEADER}",
        ],
        env: { AUTH_HEADER: `Bearer ${token}` },
      },
    },
  };
  return JSON.stringify(config, null, 2);
}
