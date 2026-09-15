/**
 * What an MCP token may do (W18). `read` is the only scope a token can be minted
 * with today; `write` arrives with the ingest (W18d–e) and is listed here so a
 * stored token row never holds a value this union doesn't know about.
 */
export const MCP_SCOPES = ["read", "write"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

/** The scopes the Settings UI mints. Widened when the write tools ship. */
export const MINTABLE_MCP_SCOPES: readonly McpScope[] = ["read"];
