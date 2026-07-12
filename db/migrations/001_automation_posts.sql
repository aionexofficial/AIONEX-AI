BEGIN;

CREATE TABLE IF NOT EXISTS automation_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL,
  social_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'failed')),
  scheduled_for DATE NOT NULL UNIQUE,
  published_at TIMESTAMPTZ,
  telegram_status TEXT NOT NULL DEFAULT 'pending' CHECK (telegram_status IN ('pending', 'published', 'failed', 'skipped')),
  telegram_post_id TEXT,
  x_status TEXT NOT NULL DEFAULT 'pending' CHECK (x_status IN ('pending', 'published', 'failed', 'skipped')),
  x_post_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_posts_published_at_idx
  ON automation_posts (published_at DESC)
  WHERE status = 'published';

COMMIT;
