CREATE TYPE "public"."project_category" AS ENUM('professional', 'personal_projects', 'relationships', 'health_wellness', 'adulting');--> statement-breakpoint
CREATE TABLE "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_phase_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"start_date" date,
	"end_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "category" "project_category";--> statement-breakpoint
UPDATE "projects" SET "category" = 'adulting' WHERE "category" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "phase_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_parent_phase_id_fk" FOREIGN KEY ("parent_phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "phases_user_id_project_id_idx" ON "phases" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "phases_parent_phase_id_idx" ON "phases" USING btree ("parent_phase_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE set null ON UPDATE no action;
