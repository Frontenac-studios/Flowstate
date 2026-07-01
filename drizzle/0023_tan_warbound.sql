CREATE TABLE "project_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "project_category" NOT NULL,
	"structure" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "project_templates_user_id_updated_at_idx" ON "project_templates" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "project_templates_user_id_name_idx" ON "project_templates" USING btree ("user_id","name");