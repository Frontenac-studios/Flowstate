import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import type { McpScope } from "@/lib/mcp/scopes";

/**
 * Personal access tokens for the MCP endpoint (W18b) — how Claude Desktop proves to
 * `/api/mcp` which user it is acting for. Claude Desktop cannot carry a Supabase
 * session cookie, and OAuth is a lot of surface for one person on one machine, so
 * it presents one of these as a bearer token instead.
 *
 * `personal`: a token is a credential of one person, never something a Partner
 * should see or use.
 *
 * The plaintext is shown once at creation and never stored. `tokenHash` is its
 * SHA-256; `tokenPrefix` is the first characters after `fs_pat_`, so the Settings
 * list can tell tokens apart without holding anything that authenticates. Revoking
 * sets `revokedAt` rather than deleting, so "revoked, last used Tuesday" stays
 * legible.
 *
 * `lastUsedAt` is telemetry the endpoint writes. It deliberately does not bump
 * `updatedAt`: that stamp drives desktop sync's last-write-wins, and a stream of
 * "used again" touches from the server must not be able to outrank a revoke the
 * desktop app made and has not pushed yet.
 */
export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").notNull(),
    /** Where it lives — "Claude Desktop, MacBook" — so revoking the right one is easy. */
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    scopes: jsonb("scopes").$type<McpScope[]>().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    /** Null = no expiry; the token lives until revoked. */
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mcp_tokens_token_hash_idx").on(table.tokenHash),
    index("mcp_tokens_user_id_idx").on(table.userId),
  ]
);
