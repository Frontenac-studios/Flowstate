CREATE TABLE "task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"blocker_task_id" uuid NOT NULL,
	"blocked_task_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocker_task_id_tasks_id_fk" FOREIGN KEY ("blocker_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocked_task_id_tasks_id_fk" FOREIGN KEY ("blocked_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_dependencies_user_blocker_blocked_idx" ON "task_dependencies" USING btree ("user_id","blocker_task_id","blocked_task_id");--> statement-breakpoint
CREATE INDEX "task_dependencies_blocked_idx" ON "task_dependencies" USING btree ("user_id","blocked_task_id");--> statement-breakpoint
CREATE INDEX "task_dependencies_blocker_idx" ON "task_dependencies" USING btree ("user_id","blocker_task_id");