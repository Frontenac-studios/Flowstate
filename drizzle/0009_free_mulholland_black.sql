CREATE TABLE "category_settings" (
	"user_id" uuid NOT NULL,
	"category" "project_category" NOT NULL,
	"label" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"weekly_target" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_settings_user_id_category_pk" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "last_used_category" "project_category";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "category" "project_category";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "category_unresolved" boolean DEFAULT false NOT NULL;