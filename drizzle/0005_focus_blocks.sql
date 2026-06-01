CREATE TABLE IF NOT EXISTS "focus_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
	"date" date NOT NULL,
	"start_min" integer NOT NULL,
	"end_min" integer NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "focus_blocks_user_id_date_idx" ON "focus_blocks" ("user_id","date");
