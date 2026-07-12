BEGIN;

CREATE TABLE IF NOT EXISTS reward_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL DEFAULT 'AIONEX Explorer',
  axp_balance BIGINT NOT NULL DEFAULT 0 CHECK (axp_balance >= 0),
  lifetime_axp BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_axp >= 0),
  login_streak INTEGER NOT NULL DEFAULT 0 CHECK (login_streak >= 0),
  last_checkin_date DATE,
  last_mined_at TIMESTAMPTZ,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES reward_users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'review')),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('wallet', 'telegram')),
  provider_user_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS reward_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('youtube_subscribe','youtube_watch','youtube_like','youtube_comment','telegram_join','telegram_read_news','x_follow','x_repost','website_visit','wallet_connect','ai_chat','daily_quiz')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_axp INTEGER NOT NULL CHECK (reward_axp BETWEEN 1 AND 100000),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  repeat_mode TEXT NOT NULL DEFAULT 'once' CHECK (repeat_mode IN ('once','daily','cooldown')),
  cooldown_hours INTEGER CHECK (cooldown_hours BETWEEN 1 AND 8760),
  verification_mode TEXT NOT NULL DEFAULT 'manual' CHECK (verification_mode IN ('manual','url','telegram','wallet','system','quiz')),
  verification_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_task_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES reward_tasks(id) ON DELETE CASCADE,
  claim_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','review')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  awarded_axp INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id, claim_key)
);

CREATE TABLE IF NOT EXISTS reward_point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('mining','daily_login','task','referral','achievement','admin_adjustment')),
  reference_type TEXT,
  reference_id UUID,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✦',
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS reward_user_badges (
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES reward_badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS reward_link_codes (
  code TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reward_anti_cheat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES reward_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 100),
  fingerprint_hash TEXT,
  ip_hash TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_settings (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL CHECK (value BETWEEN 0 AND 100000),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reward_users_leaderboard_idx ON reward_users (lifetime_axp DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS reward_claims_user_idx ON reward_task_claims (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_ledger_user_idx ON reward_point_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_risk_events_idx ON reward_anti_cheat_events (user_id, created_at DESC);

INSERT INTO reward_badges (slug, name, description, icon, criteria) VALUES
  ('first-mine', 'Genesis Miner', 'Complete the first mining session.', '◇', '{"miningClaims":1}'),
  ('streak-7', 'Seven Day Signal', 'Maintain a 7-day login streak.', '◆', '{"loginStreak":7}'),
  ('axp-1000', 'AXP Pioneer', 'Earn 1,000 lifetime AXP.', '✦', '{"lifetimeAxp":1000}')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO reward_settings (key, value) VALUES
  ('mining_axp', 100), ('daily_login_axp', 20), ('referrer_axp', 100), ('referred_axp', 50)
ON CONFLICT (key) DO NOTHING;

COMMIT;
