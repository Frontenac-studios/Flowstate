CREATE TYPE "public"."target_measure_kind" AS ENUM('currency', 'count', 'shipped');--> statement-breakpoint
CREATE TYPE "public"."target_measure_source" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."target_derivation_key" AS ENUM('money_booked', 'clients_signed', 'milestones_shipped');--> statement-breakpoint
CREATE TYPE "public"."target_state" AS ENUM('active', 'met', 'carried', 'dropped');--> statement-breakpoint
ALTER TYPE "public"."target_horizon" ADD VALUE IF NOT EXISTS 'week';--> statement-breakpoint
CREATE TABLE "directions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"direction_id" uuid NOT NULL,
	"title" text NOT NULL,
	"horizon" "target_horizon" DEFAULT 'quarter' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"measure_kind" "target_measure_kind" NOT NULL,
	"measure_source" "target_measure_source" DEFAULT 'manual' NOT NULL,
	"derivation_key" "target_derivation_key",
	"measure_target" integer NOT NULL,
	"measure_current" integer,
	"state" "target_state" DEFAULT 'active' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "target_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_learning" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "capability" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "why" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "reached_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "quarter_first_run_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_direction_id_directions_id_fk" FOREIGN KEY ("direction_id") REFERENCES "public"."directions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "directions_user_id_active_idx" ON "directions" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "targets_user_id_state_idx" ON "targets" USING btree ("user_id","state");--> statement-breakpoint
CREATE INDEX "targets_direction_id_idx" ON "targets" USING btree ("direction_id");
