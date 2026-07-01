CREATE TYPE "public"."daily_win_author" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TYPE "public"."daily_win_source" AS ENUM('task', 'care_event', 'goal', 'abyss', 'manual');--> statement-breakpoint
CREATE TYPE "public"."daily_win_state" AS ENUM('accepted', 'dismissed');--> statement-breakpoint
CREATE TABLE "daily_wins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"win_date" date NOT NULL,
	"slot" smallint,
	"source" "daily_win_source" NOT NULL,
	"ref_id" uuid,
	"label" text,
	"state" "daily_win_state" NOT NULL,
	"author" "daily_win_author" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "daily_wins_user_id_win_date_idx" ON "daily_wins" USING btree ("user_id","win_date");--> statement-breakpoint
CREATE INDEX "daily_wins_user_id_updated_at_idx" ON "daily_wins" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_wins_user_date_slot_accepted_uidx" ON "daily_wins" USING btree ("user_id","win_date","slot") WHERE "daily_wins"."state" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX "daily_wins_user_date_ref_dismissed_uidx" ON "daily_wins" USING btree ("user_id","win_date","ref_id") WHERE "daily_wins"."state" = 'dismissed' AND "daily_wins"."ref_id" IS NOT NULL;