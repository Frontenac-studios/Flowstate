CREATE TYPE "public"."protected_block_status" AS ENUM('proposed', 'confirmed');--> statement-breakpoint
CREATE TABLE "protected_block_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "project_category" NOT NULL,
	"iso_weekday" integer NOT NULL,
	"label" text,
	"start_min" integer,
	"end_min" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protected_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "project_category" NOT NULL,
	"scheduled_date" date NOT NULL,
	"label" text,
	"start_min" integer,
	"end_min" integer,
	"template_id" uuid,
	"status" "protected_block_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protected_blocks" ADD CONSTRAINT "protected_blocks_template_id_protected_block_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."protected_block_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "protected_block_templates_user_id_updated_at_idx" ON "protected_block_templates" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "protected_block_templates_user_id_iso_weekday_idx" ON "protected_block_templates" USING btree ("user_id","iso_weekday");--> statement-breakpoint
CREATE INDEX "protected_blocks_user_id_scheduled_date_idx" ON "protected_blocks" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "protected_blocks_user_id_updated_at_idx" ON "protected_blocks" USING btree ("user_id","updated_at");