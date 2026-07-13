BEGIN;
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), run_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running', stage TEXT NOT NULL DEFAULT 'news',
  news_ids JSONB NOT NULL DEFAULT '[]'::jsonb, content_id UUID REFERENCES generated_content(id),
  youtube_upload_id UUID REFERENCES youtube_uploads(id), result JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE telegram_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS root_tweet_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS telegram_posts_content_unique ON telegram_posts(content_id);
CREATE UNIQUE INDEX IF NOT EXISTS tweets_content_unique ON tweets(content_id);
CREATE UNIQUE INDEX IF NOT EXISTS youtube_uploads_content_unique ON youtube_uploads(content_id);
COMMIT;
