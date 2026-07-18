BEGIN;

ALTER TABLE reward_tasks DROP CONSTRAINT IF EXISTS reward_tasks_category_check;
ALTER TABLE reward_tasks ADD CONSTRAINT reward_tasks_category_check CHECK (category IN (
  'telegram_join','telegram_group_join','telegram_read_news',
  'x_follow','x_repost','x_like','x_profile_visit',
  'youtube_subscribe','youtube_watch','youtube_like','youtube_comment',
  'website_visit','wallet_connect','daily_login','daily_mining','referral_invite',
  'ai_chat','daily_quiz','special_campaign','tap_milestone','referral_milestone',
  'achievement_milestone','seasonal_mission'
));

CREATE INDEX IF NOT EXISTS aion_profiles_level_idx ON reward_users (level DESC, xp DESC) WHERE status='active';
CREATE INDEX IF NOT EXISTS aion_tap_batches_weekly_ranking_idx ON aion_tap_batches (user_id, server_received_at DESC) INCLUDE (accepted_taps);

CREATE TABLE IF NOT EXISTS aion_referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id UUID NOT NULL UNIQUE REFERENCES reward_users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  device_hash TEXT,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'rewarded' CHECK (status IN ('rewarded','review','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aion_referral_device_idx ON aion_referral_events(device_hash,created_at DESC) WHERE device_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS aion_referral_referrer_idx ON aion_referral_events(referrer_user_id,created_at DESC);

INSERT INTO reward_tasks(external_key,category,task_group,title,description,icon,reward_axp,reward_xp,difficulty,enabled,repeat_mode,verification_mode,verification_config,sort_order) VALUES
  ('aion-first-100-taps','tap_milestone','mining','Synchronize 100 AION taps','Complete 100 server-verified taps with AION.','⚡',50,50,'easy',TRUE,'once','system','{"requiredTaps":100}',40),
  ('aion-first-conversation','ai_chat','daily','Speak with AION','Complete a persisted conversation with your AION.','✦',20,20,'easy',TRUE,'daily','system','{"requiredMessages":2}',50),
  ('aion-referral-milestone-3','referral_milestone','referral','Build a three-creator network','Invite three verified creators to AIONEX.','◎',150,100,'medium',TRUE,'once','system','{"requiredReferrals":3}',60)
ON CONFLICT(external_key) DO NOTHING;

COMMIT;
