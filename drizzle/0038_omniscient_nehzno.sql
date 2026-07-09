CREATE TYPE "public"."calendar_connection_status" AS ENUM('active', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."calendar_provider" AS ENUM('google');--> statement-breakpoint
CREATE TYPE "public"."external_calendar_event_status" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."external_calendar_event_visibility" AS ENUM('public', 'private', 'default');--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"account_email" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"access_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"selected_calendar_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sync_cursor" text,
	"status" "calendar_connection_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider_event_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"calendar_name" text,
	"title" text,
	"location" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"status" "external_calendar_event_status" DEFAULT 'confirmed' NOT NULL,
	"visibility" "external_calendar_event_visibility" DEFAULT 'default' NOT NULL,
	"recurrence_master_id" text,
	"provider_updated_at" timestamp with time zone,
	"etag" text,
	"html_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "calendar_ai_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_connections_user_id_idx" ON "calendar_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_connections_user_id_updated_at_idx" ON "calendar_connections" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_user_id_provider_idx" ON "calendar_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "external_calendar_events_connection_calendar_event_idx" ON "external_calendar_events" USING btree ("connection_id","calendar_id","provider_event_id");--> statement-breakpoint
CREATE INDEX "external_calendar_events_user_id_start_at_idx" ON "external_calendar_events" USING btree ("user_id","start_at");