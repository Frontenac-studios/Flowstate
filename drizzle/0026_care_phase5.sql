ALTER TYPE "public"."care_event_source" ADD VALUE IF NOT EXISTS 'breathing';--> statement-breakpoint
CREATE TYPE "public"."reflection_scope" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
ALTER TABLE "care_activities" ADD COLUMN "lifts_me" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "care_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reflection_date" date NOT NULL,
	"scope" "reflection_scope" DEFAULT 'daily' NOT NULL,
	"prompt_text" text NOT NULL,
	"body_text" text,
	"mood" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "care_reflections_user_date_scope_idx" ON "care_reflections" USING btree ("user_id","reflection_date","scope");--> statement-breakpoint
CREATE INDEX "care_reflections_user_id_updated_at_idx" ON "care_reflections" USING btree ("user_id","updated_at");
