CREATE TYPE "public"."bingo_card_status" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."goal_state" AS ENUM('active', 'done', 'backburnered');--> statement-breakpoint
CREATE TYPE "public"."obligation_desire" AS ENUM('obligation', 'desire');--> statement-breakpoint
CREATE TYPE "public"."planning_suggestion_status" AS ENUM('pending', 'staged', 'applied', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."planning_suggestion_surface" AS ENUM('quarter_spread', 'week_draft', 'balance_pass', 'milestone_breakdown', 'reserved_day', 'check_in', 'year_rollover');--> statement-breakpoint
CREATE TYPE "public"."reserved_day_type" AS ENUM('outside', 'personal');--> statement-breakpoint
CREATE TYPE "public"."target_horizon" AS ENUM('year', 'quarter', 'month');--> statement-breakpoint
CREATE TABLE "bingo_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_year" integer NOT NULL,
	"status" "bingo_card_status" DEFAULT 'draft' NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bingo_card_id" uuid,
	"title" text NOT NULL,
	"category" "project_category" NOT NULL,
	"obligation_desire" "obligation_desire",
	"value_id" uuid,
	"target_horizon" "target_horizon",
	"target_year" integer,
	"target_quarter" integer,
	"target_month" integer,
	"project_id" uuid,
	"cell_index" integer,
	"state" "goal_state" DEFAULT 'active' NOT NULL,
	"completed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "month_intentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"category" "project_category" NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"surface" "planning_suggestion_surface" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "planning_suggestion_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quarter_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"phrase" text,
	"focus_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reserved_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"type" "reserved_day_type" NOT NULL,
	"label" text,
	"resolved_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "time_estimate_minutes" integer;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_bingo_card_id_bingo_cards_id_fk" FOREIGN KEY ("bingo_card_id") REFERENCES "public"."bingo_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bingo_cards_user_id_card_year_idx" ON "bingo_cards" USING btree ("user_id","card_year");--> statement-breakpoint
CREATE INDEX "bingo_cards_user_id_updated_at_idx" ON "bingo_cards" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "goal_milestones_goal_id_idx" ON "goal_milestones" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_milestones_user_id_updated_at_idx" ON "goal_milestones" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "goals_user_id_updated_at_idx" ON "goals" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "goals_bingo_card_id_idx" ON "goals" USING btree ("bingo_card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_bingo_card_cell_idx" ON "goals" USING btree ("bingo_card_id","cell_index");--> statement-breakpoint
CREATE UNIQUE INDEX "month_intentions_user_year_month_category_idx" ON "month_intentions" USING btree ("user_id","year","month","category");--> statement-breakpoint
CREATE INDEX "month_intentions_user_id_updated_at_idx" ON "month_intentions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "planning_suggestions_user_surface_status_idx" ON "planning_suggestions" USING btree ("user_id","surface","status");--> statement-breakpoint
CREATE INDEX "planning_suggestions_user_id_updated_at_idx" ON "planning_suggestions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "quarter_themes_user_year_quarter_idx" ON "quarter_themes" USING btree ("user_id","year","quarter");--> statement-breakpoint
CREATE INDEX "quarter_themes_user_id_updated_at_idx" ON "quarter_themes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "reserved_days_user_year_month_idx" ON "reserved_days" USING btree ("user_id","year","month");--> statement-breakpoint
CREATE INDEX "reserved_days_user_id_updated_at_idx" ON "reserved_days" USING btree ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_goal_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."goal_milestones"("id") ON DELETE set null ON UPDATE no action;