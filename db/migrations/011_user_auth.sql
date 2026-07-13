BEGIN;

ALTER TABLE reward_users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE reward_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE reward_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE reward_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE reward_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS reward_users_username_unique ON reward_users(LOWER(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reward_users_email_unique ON reward_users(LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('google')),
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,provider_user_id)
);

CREATE TABLE IF NOT EXISTS user_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_auth_sessions_user_idx ON user_auth_sessions(user_id,expires_at DESC);
CREATE INDEX IF NOT EXISTS user_auth_sessions_expiry_idx ON user_auth_sessions(expires_at);

COMMIT;
