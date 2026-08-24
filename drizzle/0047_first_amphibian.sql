-- W2a: rename task_time_entries -> time_entries and reshape it (project-scoped,
-- task optional, billable/source/invoiced_at, tags). NON-DESTRUCTIVE: every
-- existing row is preserved (hosted has ~3,372, verified 0 orphans).
--
-- Renumbered 0046 -> 0047 when W1.5 (0046_sweet_wiccan) landed first. Hand-written:
-- drizzle-kit cannot emit a rename + column-alter in one diff (it crashes in
-- preparePgAlterColumns). The generated 0047 snapshot — produced via the "create"
-- path — is the source of truth for the FINAL state; this file REACHES that state
-- without dropping data. Do not "regenerate" over it.

-- 1. Tags table first (time_entries.tag_id references it).
CREATE TABLE "time_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "time_tags_user_id_name_idx" ON "time_tags" USING btree ("user_id","name");--> statement-breakpoint

-- 2. Rename the table, then its carried-over constraint + indexes to match.
ALTER TABLE "task_time_entries" RENAME TO "time_entries";--> statement-breakpoint
ALTER TABLE "time_entries" RENAME CONSTRAINT "task_time_entries_pkey" TO "time_entries_pkey";--> statement-breakpoint
ALTER INDEX "task_time_entries_user_id_updated_at_idx" RENAME TO "time_entries_user_id_updated_at_idx";--> statement-breakpoint
ALTER INDEX "task_time_entries_user_id_started_at_idx" RENAME TO "time_entries_user_id_started_at_idx";--> statement-breakpoint

-- 3. task_id: now optional, and keep the row when a task is deleted (was CASCADE).
ALTER TABLE "time_entries" ALTER COLUMN "task_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" DROP CONSTRAINT "task_time_entries_task_id_tasks_id_fk";--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- 4. reason: no longer required (a project-first timer need not carry one).
ALTER TABLE "time_entries" ALTER COLUMN "reason" DROP NOT NULL;--> statement-breakpoint

-- 5. New columns. project_id lands nullable, is backfilled, then set NOT NULL.
ALTER TABLE "time_entries" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "tag_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "billable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "invoiced_at" timestamp with time zone;--> statement-breakpoint

-- 6. Backfill from existing data.
--    project_id  <- the entry's task's project (0 orphans, verified).
--    billable    <- true where that project has a client.
--    source      <- 'manual' where reason says so, else 'timer' (all legacy rows are timer-origin).
UPDATE "time_entries" e SET "project_id" = t."project_id" FROM "tasks" t WHERE t."id" = e."task_id";--> statement-breakpoint
UPDATE "time_entries" e SET "billable" = true FROM "projects" p WHERE p."id" = e."project_id" AND p."client_id" IS NOT NULL;--> statement-breakpoint
UPDATE "time_entries" SET "source" = CASE WHEN "reason" = 'manual' THEN 'manual' ELSE 'timer' END;--> statement-breakpoint

-- 7. Now that project_id is populated everywhere, enforce NOT NULL.
ALTER TABLE "time_entries" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint

-- 8. FKs for the new columns + the project index.
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tag_id_time_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."time_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_entries_user_id_project_id_idx" ON "time_entries" USING btree ("user_id","project_id");
