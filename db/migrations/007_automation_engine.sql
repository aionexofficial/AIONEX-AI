BEGIN;

CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), content_hash TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL, format TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS generated_content_created_idx ON generated_content(created_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_type TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','retry','dead','cancelled')),
  priority SMALLINT NOT NULL DEFAULT 0, attempts SMALLINT NOT NULL DEFAULT 0, max_attempts SMALLINT NOT NULL DEFAULT 5,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), locked_at TIMESTAMPTZ, locked_by TEXT, last_error TEXT,
  idempotency_key TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS scheduled_jobs_worker_idx ON scheduled_jobs(status, run_at, priority DESC);

CREATE TABLE IF NOT EXISTS telegram_posts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), content_id UUID REFERENCES generated_content(id), message_id TEXT, chat_id TEXT, status TEXT NOT NULL DEFAULT 'queued', attempts SMALLINT NOT NULL DEFAULT 0, last_error TEXT, published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tweets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), content_id UUID REFERENCES generated_content(id), tweet_id TEXT, thread_ids JSONB NOT NULL DEFAULT '[]'::jsonb, status TEXT NOT NULL DEFAULT 'queued', attempts SMALLINT NOT NULL DEFAULT 0, last_error TEXT, published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS youtube_uploads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), content_id UUID REFERENCES generated_content(id), video_id TEXT, title TEXT NOT NULL, description TEXT NOT NULL, tags JSONB NOT NULL DEFAULT '[]'::jsonb, thumbnail_prompt TEXT, voice_script TEXT, subtitles TEXT, render_job JSONB, status TEXT NOT NULL DEFAULT 'scripted', attempts SMALLINT NOT NULL DEFAULT 0, last_error TEXT, published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS automation_logs (id BIGSERIAL PRIMARY KEY, level TEXT NOT NULL, event TEXT NOT NULL, job_id UUID REFERENCES scheduled_jobs(id), message TEXT, context JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS automation_logs_created_idx ON automation_logs(created_at DESC);
CREATE TABLE IF NOT EXISTS market_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), report_type TEXT NOT NULL, report_date DATE NOT NULL, raw_data JSONB NOT NULL, summary TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(report_type, report_date));
CREATE TABLE IF NOT EXISTS news_cache (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source TEXT NOT NULL, source_url TEXT NOT NULL, canonical_url TEXT NOT NULL UNIQUE, title TEXT NOT NULL, raw_data JSONB NOT NULL, summary TEXT, importance SMALLINT NOT NULL DEFAULT 0, published_at TIMESTAMPTZ, fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS news_cache_importance_idx ON news_cache(importance DESC, published_at DESC);
CREATE TABLE IF NOT EXISTS analytics (id BIGSERIAL PRIMARY KEY, metric TEXT NOT NULL, value DOUBLE PRECISION NOT NULL, dimensions JSONB NOT NULL DEFAULT '{}'::jsonb, recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS automation_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO automation_settings(key,value) VALUES('scheduler', '{"paused":false}'::jsonb) ON CONFLICT(key) DO NOTHING;

COMMIT;
