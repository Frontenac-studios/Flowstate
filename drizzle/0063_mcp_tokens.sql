-- W18b — personal access tokens for the MCP endpoint (docs/plan-w18-mcp-endpoint.md §4).
--
-- Claude Desktop presents one of these as a bearer token to /api/mcp. The plaintext
-- (`fs_pat_` + 32 random bytes, base64url) is shown once at creation and never
-- stored: `token_hash` is its SHA-256, `token_prefix` a few leading characters so
-- the Settings list can tell tokens apart without holding anything that
-- authenticates.
--
-- Visibility class `personal` (src/db/tenancy.ts): a token is one person's
-- credential. RLS lives in supabase/rls/20260915120000_mcp_tokens_rls.sql.
--
-- 0063: the highest file on disk is 0062_project_planning.sql.

CREATE TABLE IF NOT EXISTS "mcp_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "token_hash" text NOT NULL,
  "token_prefix" text NOT NULL,
  "scopes" jsonb NOT NULL,
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "mcp_tokens_token_hash_idx" ON "mcp_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_tokens_user_id_idx" ON "mcp_tokens" USING btree ("user_id");
