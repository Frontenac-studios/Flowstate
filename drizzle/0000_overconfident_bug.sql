CREATE TABLE "health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" text NOT NULL,
	"status" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "health_checks_checked_at_idx" ON "health_checks" USING btree ("checked_at" DESC);
--> statement-breakpoint
ALTER TABLE "health_checks" ENABLE ROW LEVEL SECURITY;
