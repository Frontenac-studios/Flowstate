CREATE TYPE "public"."abyss_item_source" AS ENUM('capture', 'drop');--> statement-breakpoint
CREATE TYPE "public"."abyss_item_status" AS ENUM('active', 'promoted', 'archived');--> statement-breakpoint
CREATE TYPE "public"."abyss_item_type" AS ENUM('idea', 'task');--> statement-breakpoint
CREATE TABLE "abyss_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "abyss_item_type" DEFAULT 'idea' NOT NULL,
	"note" text,
	"links" jsonb,
	"category" "project_category",
	"source" "abyss_item_source" DEFAULT 'capture' NOT NULL,
	"status" "abyss_item_status" DEFAULT 'active' NOT NULL,
	"resurface_count" integer DEFAULT 0 NOT NULL,
	"last_resurfaced_at" timestamp with time zone,
	"last_touched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promoted_task_id" uuid,
	"promoted_target" text
);
--> statement-breakpoint
ALTER TABLE "abyss_items" ADD CONSTRAINT "abyss_items_promoted_task_id_tasks_id_fk" FOREIGN KEY ("promoted_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abyss_items_user_id_status_idx" ON "abyss_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "abyss_items_user_id_last_touched_at_idx" ON "abyss_items" USING btree ("user_id","last_touched_at");