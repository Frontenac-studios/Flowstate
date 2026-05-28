ALTER TABLE "day_reviews" ADD COLUMN "reflection_text" text;--> statement-breakpoint
ALTER TABLE "day_reviews" ADD COLUMN "reflective_question" text;--> statement-breakpoint
ALTER TABLE "day_reviews" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;