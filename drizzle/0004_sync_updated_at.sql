ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;
ALTER TABLE "task_time_entries" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;
ALTER TABLE "nudge_events" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;
ALTER TABLE "day_reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;
