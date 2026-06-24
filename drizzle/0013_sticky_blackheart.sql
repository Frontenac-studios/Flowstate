CREATE INDEX "category_settings_user_id_updated_at_idx" ON "category_settings" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "chat_messages_user_id_updated_at_idx" ON "chat_messages" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "day_reviews_user_id_updated_at_idx" ON "day_reviews" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "nudge_events_user_id_updated_at_idx" ON "nudge_events" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "phases_user_id_updated_at_idx" ON "phases" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "projects_user_id_updated_at_idx" ON "projects" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "task_time_entries_user_id_updated_at_idx" ON "task_time_entries" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "tasks_user_id_updated_at_idx" ON "tasks" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "task_bulk_imports_user_id_updated_at_idx" ON "task_bulk_imports" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "task_dependencies_user_id_updated_at_idx" ON "task_dependencies" USING btree ("user_id","updated_at");