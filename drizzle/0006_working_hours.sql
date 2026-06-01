ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "day_start_hour" integer DEFAULT 7 NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "day_end_hour" integer DEFAULT 19 NOT NULL;
