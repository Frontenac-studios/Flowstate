ALTER TABLE "app_settings" ADD COLUMN "assistance_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "morning_handoff" text DEFAULT 'on' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "goal_steering" text DEFAULT 'on' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "balance_nudge" text DEFAULT 'on' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "evidence_cadence" text DEFAULT 'quarterly' NOT NULL;
