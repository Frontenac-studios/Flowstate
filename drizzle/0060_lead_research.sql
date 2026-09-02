-- W10h — company research. The scoring brain has been judging a name and whatever
-- the owner typed; these columns hold what the web actually said, so it judges facts.
--
-- Stored rather than re-derived because each research call BUYS search results —
-- re-running it to re-score, or to redraw a card, would spend money to learn nothing
-- new. `researched_at` is what the UI reads to say how stale the facts are, and
-- `research_provider` records which adapter produced them, so a row outlives the
-- vendor that filled it (src/server/sourcing/web-research/types.ts).
--
-- `research` is facts about a company, not money — it stays on the org_shared leads
-- row. A proposal figure would go to project_fees (0059), never here.

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "research" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "researched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "research_provider" text;
