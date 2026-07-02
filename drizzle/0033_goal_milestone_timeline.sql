ALTER TABLE "goal_milestones" ADD COLUMN "target_date" date;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD COLUMN "completed_at" timestamp with time zone;
