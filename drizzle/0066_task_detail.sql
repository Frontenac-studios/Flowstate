-- Spec v5 DetailA — the task detail sheet: a deadline, notes, and a checklist.
--
-- Numbered 0066: main's highest is 0065, and 0064 stays reserved for the in-flight
-- W18b OAuth branch (0064_mcp_oauth.sql).
--
-- `tasks.due_date` is the deadline, separate from `scheduled_date` (the planned day).
-- When set it decides overdue; when null the planned day does. `tasks.notes` is free
-- text. Both hang off `tasks` (org_shared, already has RLS) — no RLS change for them.
--
-- `task_checklist_items` is a new org_shared child of `tasks` (cascade delete, like
-- task_recurrence). Its RLS lives in supabase/rls/20260929120000_task_checklist_items_rls.sql.
-- None of this is money.

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "due_date" date;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_user_id_due_date_idx" ON "tasks" USING btree ("user_id","due_date");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "task_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"text" text NOT NULL,
	"done_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_task_id_tasks_id_fk"
    FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "task_checklist_items_task_id_sort_idx" ON "task_checklist_items" USING btree ("task_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_checklist_items_user_id_updated_at_idx" ON "task_checklist_items" USING btree ("user_id","updated_at");
