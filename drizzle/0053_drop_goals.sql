-- W5a₂ — tear down the pre-mission goals model. Directions + Targets (W5)
-- replaced it; the one surviving goal row was a personal habit, not a business
-- bet, so nothing is migrated. `target_horizon` is retained (Targets use it).
ALTER TABLE "tasks" DROP COLUMN "milestone_id";
--> statement-breakpoint
DROP TABLE "goal_milestones";
--> statement-breakpoint
DROP TABLE "goals";
--> statement-breakpoint
DROP TYPE "public"."goal_state";
--> statement-breakpoint
DROP TYPE "public"."obligation_desire";
