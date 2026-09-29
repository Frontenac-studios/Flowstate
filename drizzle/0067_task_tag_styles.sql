-- Spec v3 "Ta" — tag kinds and opt-in colours.
--
-- Numbered 0067 (0066 is the task detail migration; 0064 stays reserved for W18b).
--
-- Tags stay plain names on tasks.tags; this table only styles them, per user, keyed by
-- the lower-cased name. org_shared, like tasks. RLS in
-- supabase/rls/20260929130000_task_tag_styles_rls.sql. Not money.

CREATE TABLE IF NOT EXISTS "task_tag_styles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"kind" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "task_tag_styles" ADD CONSTRAINT "task_tag_styles_kind_check"
    CHECK ("kind" IS NULL OR "kind" IN ('status', 'type', 'effort', 'people'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "task_tag_styles" ADD CONSTRAINT "task_tag_styles_color_check"
    CHECK ("color" IS NULL OR "color" IN ('sand', 'rose', 'sky', 'lilac', 'sage'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "task_tag_styles_user_id_name_key_idx" ON "task_tag_styles" USING btree ("user_id","name_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_tag_styles_user_id_updated_at_idx" ON "task_tag_styles" USING btree ("user_id","updated_at");
