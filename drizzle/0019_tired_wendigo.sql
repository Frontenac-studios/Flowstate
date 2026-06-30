CREATE TYPE "public"."about_me_author" AS ENUM('user', 'ai');--> statement-breakpoint
CREATE TYPE "public"."about_me_section" AS ENUM('values', 'work', 'life', 'constraints');--> statement-breakpoint
CREATE TYPE "public"."about_me_suggestion_status" AS ENUM('pending', 'staged', 'applied', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."constraint_severity" AS ENUM('hard', 'soft');--> statement-breakpoint
CREATE TYPE "public"."constraint_type" AS ENUM('hours', 'commitment', 'preference');--> statement-breakpoint
CREATE TYPE "public"."value_source" AS ENUM('curated', 'custom');--> statement-breakpoint
CREATE TABLE "about_me_sections" (
	"user_id" uuid NOT NULL,
	"section" "about_me_section" NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "about_me_sections_user_id_section_pk" PRIMARY KEY("user_id","section")
);
--> statement-breakpoint
CREATE TABLE "about_me_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_section" "about_me_section" NOT NULL,
	"payload" jsonb NOT NULL,
	"source_text" text,
	"learned_at" timestamp with time zone,
	"status" "about_me_suggestion_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "constraint_type" NOT NULL,
	"label" text NOT NULL,
	"schedule" jsonb,
	"severity" "constraint_severity" NOT NULL,
	"author" "about_me_author" DEFAULT 'user' NOT NULL,
	"source_text" text,
	"learned_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"source" "value_source" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "about_me_suggestions_user_target_status_idx" ON "about_me_suggestions" USING btree ("user_id","target_section","status");--> statement-breakpoint
CREATE INDEX "about_me_suggestions_user_id_updated_at_idx" ON "about_me_suggestions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "user_constraints_user_id_updated_at_idx" ON "user_constraints" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "user_values_user_id_updated_at_idx" ON "user_values" USING btree ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_value_id_user_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."user_values"("id") ON DELETE set null ON UPDATE no action;