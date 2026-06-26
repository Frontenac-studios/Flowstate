CREATE TYPE "public"."occurrence_override_status" AS ENUM('completed', 'skipped', 'rescheduled', 'edited');--> statement-breakpoint
CREATE TABLE "task_recurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"rrule" text NOT NULL,
	"start_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_occurrence_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recurrence_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"status" "occurrence_override_status" NOT NULL,
	"moved_to_date" date,
	"patch" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_recurrence" ADD CONSTRAINT "task_recurrence_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_occurrence_overrides" ADD CONSTRAINT "task_occurrence_overrides_recurrence_id_task_recurrence_id_fk" FOREIGN KEY ("recurrence_id") REFERENCES "public"."task_recurrence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_recurrence_task_id_idx" ON "task_recurrence" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_recurrence_user_id_updated_at_idx" ON "task_recurrence" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_occurrence_overrides_recurrence_date_idx" ON "task_occurrence_overrides" USING btree ("recurrence_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "task_occurrence_overrides_user_id_updated_at_idx" ON "task_occurrence_overrides" USING btree ("user_id","updated_at");