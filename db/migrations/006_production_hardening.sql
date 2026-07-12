BEGIN;
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(scope,key_hash)
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry_idx ON auth_rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS reward_users_status_updated_idx ON reward_users(status,updated_at DESC);
CREATE INDEX IF NOT EXISTS reward_identities_user_provider_idx ON reward_identities(user_id,provider);
COMMIT;
