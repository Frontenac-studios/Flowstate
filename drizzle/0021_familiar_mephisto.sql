CREATE TABLE "week_day_priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"priority_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "week_day_priorities" ADD CONSTRAINT "week_day_priorities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "week_day_priorities_user_id_scheduled_date_idx" ON "week_day_priorities" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "week_day_priorities_user_id_updated_at_idx" ON "week_day_priorities" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "week_day_priorities_user_date_slot_uidx" ON "week_day_priorities" USING btree ("user_id","scheduled_date","priority_order");--> statement-breakpoint
CREATE UNIQUE INDEX "week_day_priorities_user_task_date_uidx" ON "week_day_priorities" USING btree ("user_id","task_id","scheduled_date");