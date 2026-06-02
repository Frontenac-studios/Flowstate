CREATE TABLE "task_bulk_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_bulk_import_items" (
	"import_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_bulk_import_items_import_id_task_id_pk" PRIMARY KEY("import_id","task_id")
);
--> statement-breakpoint
ALTER TABLE "task_bulk_imports" ADD CONSTRAINT "task_bulk_imports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_bulk_import_items" ADD CONSTRAINT "task_bulk_import_items_import_id_task_bulk_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."task_bulk_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_bulk_import_items" ADD CONSTRAINT "task_bulk_import_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_bulk_imports_user_id_project_id_created_at_idx" ON "task_bulk_imports" USING btree ("user_id","project_id","created_at");--> statement-breakpoint
CREATE INDEX "task_bulk_import_items_user_id_updated_at_idx" ON "task_bulk_import_items" USING btree ("user_id","updated_at");
