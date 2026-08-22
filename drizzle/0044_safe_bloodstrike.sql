ALTER TABLE "about_me_sections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "about_me_suggestions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bingo_cards" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_wins" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidence_editions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "health_checks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "month_intentions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nudge_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planning_suggestions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_similarity" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quarter_themes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_dependencies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_constraints" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_values" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "about_me_sections" CASCADE;--> statement-breakpoint
DROP TABLE "about_me_suggestions" CASCADE;--> statement-breakpoint
DROP TABLE "bingo_cards" CASCADE;--> statement-breakpoint
DROP TABLE "daily_wins" CASCADE;--> statement-breakpoint
DROP TABLE "evidence_editions" CASCADE;--> statement-breakpoint
DROP TABLE "health_checks" CASCADE;--> statement-breakpoint
DROP TABLE "month_intentions" CASCADE;--> statement-breakpoint
DROP TABLE "nudge_events" CASCADE;--> statement-breakpoint
DROP TABLE "planning_suggestions" CASCADE;--> statement-breakpoint
DROP TABLE "project_similarity" CASCADE;--> statement-breakpoint
DROP TABLE "quarter_themes" CASCADE;--> statement-breakpoint
DROP TABLE "task_dependencies" CASCADE;--> statement-breakpoint
DROP TABLE "user_constraints" CASCADE;--> statement-breakpoint
DROP TABLE "user_values" CASCADE;--> statement-breakpoint
ALTER TABLE "goals" DROP CONSTRAINT "goals_bingo_card_id_bingo_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "goals" DROP CONSTRAINT "goals_value_id_user_values_id_fk";
--> statement-breakpoint
DROP INDEX "goals_bingo_card_id_idx";--> statement-breakpoint
DROP INDEX "goals_bingo_card_cell_idx";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "morning_handoff";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "goal_steering";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "balance_nudge";--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN "evidence_cadence";--> statement-breakpoint
ALTER TABLE "goals" DROP COLUMN "bingo_card_id";--> statement-breakpoint
ALTER TABLE "goals" DROP COLUMN "value_id";--> statement-breakpoint
ALTER TABLE "goals" DROP COLUMN "cell_index";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "embedding";--> statement-breakpoint
DROP TYPE "public"."about_me_author";--> statement-breakpoint
DROP TYPE "public"."about_me_section";--> statement-breakpoint
DROP TYPE "public"."about_me_suggestion_status";--> statement-breakpoint
DROP TYPE "public"."constraint_severity";--> statement-breakpoint
DROP TYPE "public"."constraint_type";--> statement-breakpoint
DROP TYPE "public"."value_source";--> statement-breakpoint
DROP TYPE "public"."daily_win_author";--> statement-breakpoint
DROP TYPE "public"."daily_win_source";--> statement-breakpoint
DROP TYPE "public"."daily_win_state";--> statement-breakpoint
DROP TYPE "public"."bingo_card_status";--> statement-breakpoint
DROP TYPE "public"."planning_suggestion_status";--> statement-breakpoint
DROP TYPE "public"."planning_suggestion_surface";--> statement-breakpoint
DROP TYPE "public"."project_similarity_source";