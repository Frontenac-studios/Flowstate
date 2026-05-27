ALTER TABLE day_reviews ADD COLUMN IF NOT EXISTS reflection_text text;
ALTER TABLE day_reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
