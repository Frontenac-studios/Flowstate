CREATE TABLE "week_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"summary" text,
	"reflection_text" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "week_reviews_user_id_week_start_idx" ON "week_reviews" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE INDEX "week_reviews_user_id_updated_at_idx" ON "week_reviews" USING btree ("user_id","updated_at");