CREATE TABLE IF NOT EXISTS "focus_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_min" integer NOT NULL,
	"end_min" integer NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "day_start_hour" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "day_end_hour" integer DEFAULT 19 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "focus_blocks" ADD CONSTRAINT "focus_blocks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "focus_blocks_user_id_date_idx" ON "focus_blocks" USING btree ("user_id","date");
