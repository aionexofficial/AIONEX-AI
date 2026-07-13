BEGIN;

CREATE TABLE IF NOT EXISTS reward_mining_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  stopped_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  awarded_axp INTEGER NOT NULL DEFAULT 0 CHECK (awarded_axp >= 0),
  awarded_xp INTEGER NOT NULL DEFAULT 0 CHECK (awarded_xp >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS reward_mining_one_active_per_user
  ON reward_mining_sessions(user_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS reward_mining_user_history
  ON reward_mining_sessions(user_id,started_at DESC);

INSERT INTO reward_settings(key,value) VALUES
  ('mining_session_minutes',60)
ON CONFLICT(key) DO NOTHING;

COMMIT;
