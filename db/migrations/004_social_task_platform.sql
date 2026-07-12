BEGIN;

ALTER TABLE reward_tasks DROP CONSTRAINT IF EXISTS reward_tasks_category_check;
ALTER TABLE reward_tasks ADD CONSTRAINT reward_tasks_category_check CHECK (category IN (
  'telegram_join','telegram_group_join','telegram_read_news',
  'x_follow','x_repost','x_like','x_profile_visit',
  'youtube_subscribe','youtube_watch','youtube_like','youtube_comment',
  'website_visit','wallet_connect','daily_login','daily_mining','referral_invite',
  'ai_chat','daily_quiz','special_campaign'
));
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '✦';
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS reward_xp INTEGER NOT NULL DEFAULT 0 CHECK (reward_xp BETWEEN 0 AND 100000);
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard','legendary'));
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS task_group TEXT NOT NULL DEFAULT 'social' CHECK (task_group IN ('daily','social','mining','referral','special'));
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS task_url TEXT;
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE reward_task_claims ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE reward_task_claims ADD COLUMN IF NOT EXISTS verification_message TEXT;

CREATE INDEX IF NOT EXISTS reward_tasks_active_group_idx ON reward_tasks (task_group, sort_order, created_at) WHERE enabled=TRUE;
CREATE INDEX IF NOT EXISTS reward_claims_task_status_idx ON reward_task_claims (task_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_claims_verified_leaderboard_idx ON reward_task_claims (user_id, verified_at DESC) WHERE status='verified';
CREATE INDEX IF NOT EXISTS reward_users_xp_leaderboard_idx ON reward_users (xp DESC) WHERE status='active';

COMMIT;
