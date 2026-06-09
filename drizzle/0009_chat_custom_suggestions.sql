CREATE TABLE "chat_custom_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"label" text NOT NULL,
	"send_count" integer DEFAULT 0 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"promoted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "chat_custom_suggestions_user_id_normalized_text_idx" ON "chat_custom_suggestions" USING btree ("user_id","normalized_text");