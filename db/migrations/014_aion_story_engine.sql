BEGIN;

CREATE TABLE IF NOT EXISTS story_content_categories (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 100 CHECK(weight BETWEEN 0 AND 1000),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  product_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_background_templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_keys JSONB NOT NULL DEFAULT '[]',
  palette JSONB NOT NULL DEFAULT '{}',
  elements JSONB NOT NULL DEFAULT '[]',
  motion JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_key TEXT NOT NULL UNIQUE,
  category_key TEXT NOT NULL REFERENCES story_content_categories(key),
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  hook TEXT NOT NULL,
  narration TEXT NOT NULL,
  presenter TEXT NOT NULL DEFAULT 'animated_core' CHECK(presenter IN ('animated_core','human_avatar','voice_only','app_demo')),
  duration_seconds INTEGER NOT NULL CHECK(duration_seconds BETWEEN 15 AND 90),
  thumbnail_text TEXT NOT NULL,
  telegram_caption TEXT NOT NULL,
  youtube_title TEXT NOT NULL,
  youtube_description TEXT NOT NULL,
  x_caption TEXT NOT NULL,
  hashtags JSONB NOT NULL DEFAULT '[]',
  call_to_action TEXT NOT NULL,
  factual_safety_notes JSONB NOT NULL DEFAULT '[]',
  source_references JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','rejected','rendering','previewed','published','failed')),
  preview_only BOOLEAN NOT NULL DEFAULT TRUE,
  scheduled_for DATE,
  quality_score NUMERIC(5,2),
  repetition_score NUMERIC(5,2),
  fingerprint TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS story_scenarios_history_idx ON story_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS story_scenarios_category_idx ON story_scenarios(category_key,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS story_scenarios_schedule_idx ON story_scenarios(scheduled_for) WHERE scheduled_for IS NOT NULL AND status<>'rejected';

CREATE TABLE IF NOT EXISTS story_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES story_scenarios(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 20),
  purpose TEXT NOT NULL,
  start_seconds NUMERIC(6,2) NOT NULL,
  end_seconds NUMERIC(6,2) NOT NULL,
  narration TEXT NOT NULL,
  on_screen_text TEXT NOT NULL,
  subtitle_text TEXT NOT NULL,
  background_template_key TEXT REFERENCES story_background_templates(key),
  visual_instructions JSONB NOT NULL DEFAULT '[]',
  motion_instructions JSONB NOT NULL DEFAULT '[]',
  asset_references JSONB NOT NULL DEFAULT '[]',
  UNIQUE(scenario_id,position),
  CHECK(end_seconds>start_seconds)
);

CREATE TABLE IF NOT EXISTS story_quality_scores (
  scenario_id UUID PRIMARY KEY REFERENCES story_scenarios(id) ON DELETE CASCADE,
  dimensions JSONB NOT NULL,
  total_score NUMERIC(5,2) NOT NULL,
  repetition_risk NUMERIC(5,2) NOT NULL,
  approved BOOLEAN NOT NULL,
  rejection_reasons JSONB NOT NULL DEFAULT '[]',
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES story_scenarios(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'creatomate',
  presenter TEXT NOT NULL DEFAULT 'animated_core',
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','narrating','rendering','validating','ready','failed')),
  provider_job_id TEXT,
  video_url TEXT,
  audio_asset_id UUID,
  duration_seconds NUMERIC(6,2),
  width INTEGER,
  height INTEGER,
  has_audio BOOLEAN,
  has_subtitles BOOLEAN,
  validation JSONB NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS story_render_jobs_status_idx ON story_render_jobs(status,updated_at DESC);

CREATE TABLE IF NOT EXISTS story_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES story_scenarios(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('telegram','youtube','x','preview')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','failed','skipped')),
  external_id TEXT,
  external_url TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scenario_id,platform)
);

CREATE TABLE IF NOT EXISTS story_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO story_settings(key,value) VALUES ('engine','{"generationEnabled":true,"renderingEnabled":true,"publishingEnabled":false,"dryRun":true,"previewOnly":true,"dailyTime":"10:00","timezone":"UTC","durationSeconds":50,"tone":"intelligent, calm, confident","voice":"alloy","backgroundStyle":"aionex_holographic","subtitleStyle":"mobile_high_contrast","repetitionThreshold":42,"minimumQualityScore":78,"dailyVideoLimit":1,"emergencyPause":false,"preferredCategories":[],"blockedCategories":[],"categoryWeights":{}}') ON CONFLICT(key) DO NOTHING;

COMMIT;
