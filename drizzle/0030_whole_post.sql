ALTER TABLE "app_settings" ADD COLUMN "top3_midday_checkin" text DEFAULT 'on' NOT NULL;--> statement-breakpoint
ALTER TABLE "protected_blocks" ADD COLUMN "source" text;