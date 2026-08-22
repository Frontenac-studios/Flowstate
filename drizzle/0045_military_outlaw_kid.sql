CREATE TYPE "public"."client_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_state" AS ENUM('prospect', 'active', 'paused', 'done');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"amount_cents" integer NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abyss_items" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "last_used_category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "category_settings" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "project_templates" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "protected_block_templates" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "protected_blocks" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."project_category";--> statement-breakpoint
CREATE TYPE "public"."project_category" AS ENUM('business', 'personal');--> statement-breakpoint
-- Enum value collapse (W1). drizzle-kit emits a bare `::project_category` cast,
-- which throws `invalid input value for enum` on every row still holding an old
-- five-value label. Replaced by hand with the mapping the spec mandates:
--   professional -> business ; personal_projects | relationships | body_mind | adulting -> personal.
-- The `WHEN ... IS NULL THEN NULL` arm preserves nullable columns
-- (abyss_items.category, app_settings.last_used_category) instead of coercing NULL
-- into 'personal' via the ELSE branch.
ALTER TABLE "abyss_items" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" IS NULL THEN NULL WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "last_used_category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "last_used_category" IS NULL THEN NULL WHEN "last_used_category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "category_settings" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "project_templates" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "protected_block_templates" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "protected_blocks" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "category" SET DATA TYPE "public"."project_category" USING (CASE WHEN "category" = 'professional' THEN 'business' ELSE 'personal' END)::"public"."project_category";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "state" "project_state" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_maintenance" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_user_id_status_idx" ON "clients" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "clients_user_id_updated_at_idx" ON "clients" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "rates_user_id_client_id_idx" ON "rates" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "rates_user_id_project_id_idx" ON "rates" USING btree ("user_id","project_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_id_client_id_idx" ON "projects" USING btree ("user_id","client_id");