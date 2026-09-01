CREATE TYPE "public"."lead_source" AS ENUM('sourced', 'manual', 'intake');--> statement-breakpoint
CREATE TYPE "public"."lead_state" AS ENUM('new', 'contacted', 'engaged', 'proposal', 'promoted', 'dismissed', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."lead_outreach_kind" AS ENUM('opener', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."lead_outreach_status" AS ENUM('draft', 'sent');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"segment" text,
	"source" "lead_source" DEFAULT 'manual' NOT NULL,
	"score" integer,
	"confidence" integer,
	"rank" integer,
	"rationale" jsonb,
	"state" "lead_state" DEFAULT 'new' NOT NULL,
	"dismiss_reason" text,
	"snooze_until" timestamp with time zone,
	"run_id" uuid,
	"project_id" uuid,
	"direction_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sourcing_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"segments" jsonb,
	"exclusions" jsonb,
	"weights" jsonb,
	"outreach_voice" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_outreach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"kind" "lead_outreach_kind" NOT NULL,
	"body" text NOT NULL,
	"status" "lead_outreach_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_direction_id_directions_id_fk" FOREIGN KEY ("direction_id") REFERENCES "public"."directions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_outreach" ADD CONSTRAINT "lead_outreach_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_user_id_state_idx" ON "leads" USING btree ("user_id","state");--> statement-breakpoint
CREATE INDEX "leads_user_id_rank_idx" ON "leads" USING btree ("user_id","rank");--> statement-breakpoint
CREATE INDEX "leads_direction_id_idx" ON "leads" USING btree ("direction_id");--> statement-breakpoint
CREATE INDEX "lead_outreach_lead_id_idx" ON "lead_outreach" USING btree ("lead_id");
