BEGIN;
ALTER TABLE reward_users ADD COLUMN IF NOT EXISTS xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0);
ALTER TABLE reward_users ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1);
ALTER TABLE reward_point_ledger ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0);
INSERT INTO reward_settings (key, value) VALUES ('mining_cooldown_hours',24),('mining_xp',25),('daily_login_xp',10),('task_xp_percent',25) ON CONFLICT (key) DO NOTHING;
CREATE INDEX IF NOT EXISTS reward_users_referrer_idx ON reward_users (referred_by, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_ledger_reason_idx ON reward_point_ledger (user_id, reason, created_at DESC);
INSERT INTO reward_badges (slug,name,description,icon,criteria) VALUES
('miner-7','Weekly Miner','Complete seven mining sessions.','⛏','{"miningClaims":7}'),
('referral-5','Network Builder','Invite five verified explorers.','◎','{"referrals":5}'),
('level-5','Signal Adept','Reach level five.','▲','{"level":5}') ON CONFLICT (slug) DO NOTHING;
COMMIT;
