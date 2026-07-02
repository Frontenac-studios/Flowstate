CREATE TABLE "evidence_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"ref_id" uuid,
	"narrative" jsonb DEFAULT '{"throughline":"","anchors":[]}'::jsonb NOT NULL,
	"state" text DEFAULT 'unseen' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "evidence_editions_user_id_updated_at_idx" ON "evidence_editions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "evidence_editions_user_kind_period_idx" ON "evidence_editions" USING btree ("user_id","kind","period_start");
