import { describe, expect, it } from "vitest";

import { claudeDesktopConfig } from "./desktop-config";

describe("claudeDesktopConfig", () => {
  it("passes the token through env, with no space in the header argument", () => {
    const config = JSON.parse(claudeDesktopConfig("https://example.com/api/mcp", "fs_pat_abc"));
    const server = config.mcpServers.flowstate;
    expect(server.command).toBe("npx");
    expect(server.args).toEqual([
      "mcp-remote@0.13.5",
      "https://example.com/api/mcp",
      "--header",
      "Authorization:${AUTH_HEADER}",
    ]);
    expect(server.env).toEqual({ AUTH_HEADER: "Bearer fs_pat_abc" });
    expect(server.args.join(" ")).not.toContain("fs_pat_abc");
  });
});
