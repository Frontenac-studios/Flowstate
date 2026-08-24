CREATE TABLE "business_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text,
	"category" text,
	"incurred_on" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"tax_reserve_percent" integer,
	"cost_of_living_cents" integer,
	"personal_savings_cents" integer,
	"minimum_draw_cents" integer,
	"bank_balance_cents" integer,
	"bank_balance_reconciled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "business_expenses_user_id_incurred_on_idx" ON "business_expenses" USING btree ("user_id","incurred_on");