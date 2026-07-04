CREATE TYPE "public"."project_similarity_source" AS ENUM('user', 'inferred');--> statement-breakpoint
CREATE TABLE "project_similarity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"similar_project_id" uuid NOT NULL,
	"source" "project_similarity_source" NOT NULL,
	"score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "embedding" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "project_similarity_project_similar_uidx" ON "project_similarity" USING btree ("user_id","project_id","similar_project_id");--> statement-breakpoint
CREATE INDEX "project_similarity_user_id_updated_at_idx" ON "project_similarity" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "project_similarity_user_id_project_id_idx" ON "project_similarity" USING btree ("user_id","project_id");
