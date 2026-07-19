BEGIN;

CREATE TABLE IF NOT EXISTS daily_task_periods(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date DATE NOT NULL UNIQUE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived','error')),
  notification_status TEXT NOT NULL DEFAULT 'pending' CHECK(notification_status IN ('pending','sending','sent','skipped','failed')),
  notification_message_id TEXT,
  notification_attempted_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  last_error TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(ends_at>starts_at)
);

CREATE TABLE IF NOT EXISTS daily_task_templates(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'D',
  reward_axp INTEGER NOT NULL DEFAULT 0 CHECK(reward_axp BETWEEN 0 AND 100000),
  reward_xp INTEGER NOT NULL DEFAULT 0 CHECK(reward_xp BETWEEN 0 AND 100000),
  reward_energy INTEGER NOT NULL DEFAULT 0 CHECK(reward_energy BETWEEN 0 AND 100000),
  reward_chest_progress INTEGER NOT NULL DEFAULT 0 CHECK(reward_chest_progress BETWEEN 0 AND 100000),
  reward_streak_progress INTEGER NOT NULL DEFAULT 0 CHECK(reward_streak_progress BETWEEN 0 AND 100000),
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK(difficulty IN ('easy','medium','hard','legendary')),
  verification_mode TEXT NOT NULL DEFAULT 'system' CHECK(verification_mode IN ('manual','url','telegram','wallet','system','quiz')),
  verification_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  task_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS daily_period_id UUID REFERENCES daily_task_periods(id);
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS daily_template_id UUID REFERENCES daily_task_templates(id);
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS reward_energy INTEGER NOT NULL DEFAULT 0 CHECK(reward_energy BETWEEN 0 AND 100000);
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS reward_chest_progress INTEGER NOT NULL DEFAULT 0 CHECK(reward_chest_progress BETWEEN 0 AND 100000);
ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS reward_streak_progress INTEGER NOT NULL DEFAULT 0 CHECK(reward_streak_progress BETWEEN 0 AND 100000);
CREATE UNIQUE INDEX IF NOT EXISTS reward_tasks_daily_template_period_unique ON reward_tasks(daily_period_id,daily_template_id) WHERE daily_period_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS daily_task_user_progress(
  period_id UUID NOT NULL REFERENCES daily_task_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES reward_tasks(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress>=0),
  chest_progress INTEGER NOT NULL DEFAULT 0 CHECK(chest_progress>=0),
  streak_progress INTEGER NOT NULL DEFAULT 0 CHECK(streak_progress>=0),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(period_id,user_id,task_id)
);

CREATE TABLE IF NOT EXISTS daily_task_refresh_runs(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date DATE NOT NULL,
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','success','error','duplicate')),
  tasks_generated INTEGER NOT NULL DEFAULT 0,
  users_assigned INTEGER NOT NULL DEFAULT 0,
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS daily_task_refresh_runs_time_idx ON daily_task_refresh_runs(started_at DESC);

INSERT INTO daily_task_templates(key,category,title,description,icon,reward_axp,reward_xp,reward_energy,reward_chest_progress,reward_streak_progress,difficulty,verification_mode,verification_config,task_url,sort_order,enabled) VALUES
('daily-login','daily_login','Daily login','Open AIONEX and claim today''s login signal.','L',20,10,50,1,1,'easy','system','{}',NULL,10,TRUE),
('daily-mining','daily_mining','Mine 100 signals','Complete 100 server-verified taps today.','M',50,25,100,2,1,'easy','system','{"requiredTaps":100}',NULL,20,TRUE),
('daily-taps','tap_milestone','Tap accelerator','Complete 250 server-verified taps today.','T',75,40,150,2,1,'medium','system','{"requiredTaps":250}',NULL,30,TRUE),
('daily-telegram','telegram_join','Telegram signal','Verify membership in the official AIONEX Telegram channel.','G',30,15,50,1,1,'easy','telegram','{"channelId":"@aionexweb3","botTokenEnv":"TELEGRAM_BOT_TOKEN"}','https://t.me/aionexweb3',40,TRUE),
('daily-youtube','youtube_watch','YouTube intelligence','Complete today''s configured AIONEX YouTube mission.','Y',40,20,50,1,1,'easy','manual','{}','https://www.youtube.com/@aionexweb3',50,TRUE),
('daily-referral','referral_invite','Grow the network','Invite one verified creator today.','R',100,50,100,3,1,'medium','system','{"requiredReferrals":1}',NULL,60,TRUE),
('daily-ai','ai_chat','Talk with AION','Exchange at least two messages with AION today.','A',30,20,75,1,1,'easy','system','{"requiredMessages":2}',NULL,70,TRUE)
ON CONFLICT(key) DO NOTHING;

-- Retire only the former floating daily definitions. Claims and reward history remain intact.
UPDATE reward_tasks SET enabled=FALSE,ends_at=COALESCE(ends_at,NOW()),updated_at=NOW()
WHERE repeat_mode='daily' AND daily_period_id IS NULL AND task_group='daily';

INSERT INTO reward_settings(key,value) VALUES('daily_task_notification_enabled',1),('daily_task_refresh_hour_utc',0)
ON CONFLICT(key) DO NOTHING;

CREATE OR REPLACE FUNCTION aion_provision_new_reward_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO aion_character_profiles(user_id,current_energy,max_energy,energy_regen_amount,energy_regen_interval_seconds,tap_power,critical_chance_bps,critical_multiplier_bps,economy_version)
  VALUES(NEW.id,COALESCE((SELECT value FROM reward_settings WHERE key='aion_default_max_energy'),1000),COALESCE((SELECT value FROM reward_settings WHERE key='aion_default_max_energy'),1000),COALESCE((SELECT value FROM reward_settings WHERE key='aion_energy_regen_amount'),1),COALESCE((SELECT value FROM reward_settings WHERE key='aion_energy_regen_interval_seconds'),6),COALESCE((SELECT value FROM reward_settings WHERE key='aion_base_tap_power'),1),COALESCE((SELECT value FROM reward_settings WHERE key='aion_critical_chance_bps'),500),COALESCE((SELECT value FROM reward_settings WHERE key='aion_critical_multiplier_bps'),20000),COALESCE((SELECT value FROM reward_settings WHERE key='aion_economy_version'),1))
  ON CONFLICT(user_id) DO NOTHING;
  INSERT INTO daily_task_user_progress(period_id,user_id,task_id)
  SELECT p.id,NEW.id,t.id FROM daily_task_periods p JOIN reward_tasks t ON t.daily_period_id=p.id
  WHERE p.status='active' AND p.starts_at<=NOW() AND p.ends_at>NOW()
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS aion_reward_user_profile_trigger ON reward_users;
CREATE TRIGGER aion_reward_user_profile_trigger AFTER INSERT ON reward_users FOR EACH ROW EXECUTE FUNCTION aion_provision_new_reward_user();

INSERT INTO aion_character_profiles(user_id,current_energy,max_energy,energy_regen_amount,energy_regen_interval_seconds,tap_power,critical_chance_bps,critical_multiplier_bps,economy_version)
SELECT u.id,s.max_energy,s.max_energy,s.regen,s.interval_seconds,s.tap_power,s.critical_chance,s.critical_multiplier,s.economy_version FROM reward_users u CROSS JOIN LATERAL(SELECT COALESCE((SELECT value FROM reward_settings WHERE key='aion_default_max_energy'),1000) max_energy,COALESCE((SELECT value FROM reward_settings WHERE key='aion_energy_regen_amount'),1) regen,COALESCE((SELECT value FROM reward_settings WHERE key='aion_energy_regen_interval_seconds'),6) interval_seconds,COALESCE((SELECT value FROM reward_settings WHERE key='aion_base_tap_power'),1) tap_power,COALESCE((SELECT value FROM reward_settings WHERE key='aion_critical_chance_bps'),500) critical_chance,COALESCE((SELECT value FROM reward_settings WHERE key='aion_critical_multiplier_bps'),20000) critical_multiplier,COALESCE((SELECT value FROM reward_settings WHERE key='aion_economy_version'),1) economy_version)s
ON CONFLICT(user_id) DO NOTHING;

COMMIT;
