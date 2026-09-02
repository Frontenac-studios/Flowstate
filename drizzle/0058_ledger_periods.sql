-- W8 — the Ledger. A sealed fortnight: the biweekly said-vs-spent read, frozen
-- once the fortnight closes.
--
-- The seconds and the breakdown are derivable from time_entries (append-only, so
-- any past fortnight recomputes exactly). The declared tilt is NOT: it is a single
-- mutable value on app_settings with no history, so recomputing a historical
-- ledger would read it against today's declaration and silently rewrite what the
-- owner said at the time. Freezing the whole read also preserves client and
-- project names as they read then.
--
-- Sealing is lazy and idempotent (ledger.seal, on opening Money) — there is no
-- cron, because law 3 forbids anything about the Ledger reaching the user on a
-- surface they did not open. The in-progress fortnight is never sealed.
--
-- financial-class (src/db/tenancy.ts); RLS in
-- supabase/rls/20260902120000_ledger_periods_rls.sql.
CREATE TABLE IF NOT EXISTS "ledger_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"tilt_business_pct" integer,
	"business_seconds" integer NOT NULL,
	"personal_seconds" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"sealed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_periods_user_id_period_start_idx" ON "ledger_periods" ("user_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_periods_user_id_sealed_at_idx" ON "ledger_periods" ("user_id","sealed_at");
