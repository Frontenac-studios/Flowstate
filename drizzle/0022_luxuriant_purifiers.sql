CREATE TYPE "public"."care_event_source" AS ENUM('practice', 'bingo');--> statement-breakpoint
ALTER TABLE "care_events" ADD COLUMN "source" "care_event_source" DEFAULT 'practice' NOT NULL;--> statement-breakpoint
ALTER TABLE "care_events" ADD COLUMN "meta" jsonb;