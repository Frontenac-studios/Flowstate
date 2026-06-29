CREATE TYPE "public"."care_cadence" AS ENUM('daily', 'most_days', 'weekly', 'when_needed');--> statement-breakpoint
CREATE TYPE "public"."care_kind" AS ENUM('walk', 'breathe', 'reflect', 'custom');--> statement-breakpoint
CREATE TYPE "public"."care_source" AS ENUM('suggested', 'custom');--> statement-breakpoint
CREATE TYPE "public"."care_theme" AS ENUM('move', 'calm', 'connect', 'rest', 'nourish', 'reflect');--> statement-breakpoint
CREATE TABLE "care_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"theme" "care_theme" NOT NULL,
	"kind" "care_kind",
	"cadence" "care_cadence",
	"note" text,
	"source" "care_source" NOT NULL,
	"catalog_key" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "care_activity_id" uuid;--> statement-breakpoint
ALTER TABLE "care_events" ADD CONSTRAINT "care_events_activity_id_care_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."care_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_activities_user_id_updated_at_idx" ON "care_activities" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "care_events_user_id_occurred_at_idx" ON "care_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "care_events_activity_id_idx" ON "care_events" USING btree ("activity_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_care_activity_id_care_activities_id_fk" FOREIGN KEY ("care_activity_id") REFERENCES "public"."care_activities"("id") ON DELETE set null ON UPDATE no action;