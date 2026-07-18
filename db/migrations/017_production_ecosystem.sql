BEGIN;

-- Local production publishing supports one public Short and one public standard upload.
ALTER TABLE youtube_uploads ADD COLUMN IF NOT EXISTS publication_variant TEXT NOT NULL DEFAULT 'video';
ALTER TABLE youtube_uploads DROP CONSTRAINT IF EXISTS youtube_uploads_publication_variant_check;
ALTER TABLE youtube_uploads ADD CONSTRAINT youtube_uploads_publication_variant_check CHECK(publication_variant IN ('short','video'));
DROP INDEX IF EXISTS youtube_uploads_content_unique;
CREATE UNIQUE INDEX IF NOT EXISTS youtube_uploads_content_variant_unique ON youtube_uploads(content_id,publication_variant);

-- New profiles start at 1,000 energy. Existing energy and balances are preserved.
ALTER TABLE aion_character_profiles ALTER COLUMN current_energy SET DEFAULT 1000;
ALTER TABLE aion_character_profiles ALTER COLUMN max_energy SET DEFAULT 1000;

INSERT INTO reward_settings(key,value) VALUES
  ('aion_default_max_energy',1000),('aion_tap_reward_per_level',2),('aion_xp_per_level',500),
  ('daily_streak_7_bonus_axp',100),('daily_streak_30_bonus_axp',750),
  ('daily_streak_7_bonus_xp',50),('daily_streak_30_bonus_xp',300),
  ('prestige_required_level',100),('prestige_bonus_bps',500),
  ('mystery_chest_daily_limit',3)
ON CONFLICT(key) DO NOTHING;

ALTER TABLE reward_point_ledger DROP CONSTRAINT IF EXISTS reward_point_ledger_reason_check;
ALTER TABLE reward_point_ledger ADD CONSTRAINT reward_point_ledger_reason_check CHECK(reason IN ('mining','daily_login','task','referral','achievement','admin_adjustment','chest','season','prestige'));

CREATE TABLE IF NOT EXISTS aion_mystery_chest_definitions(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),key TEXT NOT NULL UNIQUE,name TEXT NOT NULL,enabled BOOLEAN NOT NULL DEFAULT TRUE,
  cost_axp INTEGER NOT NULL DEFAULT 0 CHECK(cost_axp>=0),reward_pool JSONB NOT NULL,updated_by TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS aion_mystery_chest_opens(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,chest_id UUID NOT NULL REFERENCES aion_mystery_chest_definitions(id),
  idempotency_key TEXT NOT NULL,reward_type TEXT NOT NULL,reward_amount INTEGER NOT NULL DEFAULT 0,reward_item TEXT,metadata JSONB NOT NULL DEFAULT '{}'::jsonb,opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,idempotency_key)
);

CREATE TABLE IF NOT EXISTS aion_prestige_profiles(
  user_id UUID PRIMARY KEY REFERENCES reward_users(id) ON DELETE CASCADE,prestige_count INTEGER NOT NULL DEFAULT 0,permanent_bonus_bps INTEGER NOT NULL DEFAULT 0,last_prestiged_at TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS aion_prestige_history(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,prestige_number INTEGER NOT NULL,level_before INTEGER NOT NULL,xp_before BIGINT NOT NULL,bonus_bps INTEGER NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,prestige_number)
);

CREATE TABLE IF NOT EXISTS aion_seasons(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),key TEXT NOT NULL UNIQUE,name TEXT NOT NULL,starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL,enabled BOOLEAN NOT NULL DEFAULT TRUE,reward_config JSONB NOT NULL DEFAULT '{}'::jsonb,event_config JSONB NOT NULL DEFAULT '{}'::jsonb,updated_by TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),CHECK(ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS aion_season_progress(
  season_id UUID NOT NULL REFERENCES aion_seasons(id) ON DELETE CASCADE,user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,season_xp BIGINT NOT NULL DEFAULT 0,claimed_rewards JSONB NOT NULL DEFAULT '[]'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(season_id,user_id)
);
CREATE TABLE IF NOT EXISTS aion_season_achievements(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),season_id UUID NOT NULL REFERENCES aion_seasons(id) ON DELETE CASCADE,key TEXT NOT NULL,name TEXT NOT NULL,criteria JSONB NOT NULL,reward_config JSONB NOT NULL DEFAULT '{}'::jsonb,enabled BOOLEAN NOT NULL DEFAULT TRUE,UNIQUE(season_id,key)
);

CREATE OR REPLACE FUNCTION aion_credit_active_season_xp() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.xp_awarded>0 THEN
    INSERT INTO aion_season_progress(season_id,user_id,season_xp)
    SELECT id,NEW.user_id,NEW.xp_awarded FROM aion_seasons WHERE enabled=TRUE AND NOW()>=starts_at AND NOW()<ends_at
    ON CONFLICT(season_id,user_id) DO UPDATE SET season_xp=aion_season_progress.season_xp+EXCLUDED.season_xp,updated_at=NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS aion_reward_ledger_season_xp ON reward_point_ledger;
CREATE TRIGGER aion_reward_ledger_season_xp AFTER INSERT ON reward_point_ledger FOR EACH ROW EXECUTE FUNCTION aion_credit_active_season_xp();

INSERT INTO aion_mystery_chest_definitions(key,name,reward_pool) VALUES
('daily-signal','Daily Signal Chest','[{"type":"axp","amount":50,"weight":40},{"type":"xp","amount":40,"weight":30},{"type":"energy","amount":250,"weight":20},{"type":"item","item":"quantum-shard","amount":1,"weight":7},{"type":"skin","item":"signal-aurora","amount":1,"weight":3}]'::jsonb)
ON CONFLICT(key) DO NOTHING;

INSERT INTO reward_badges(slug,name,description,icon,criteria) VALUES
('first-tap','First Tap','Complete the first verified AION tap.','1','{"totalTaps":1}'),
('taps-1000','Signal Miner','Complete 1,000 verified taps.','1K','{"totalTaps":1000}'),
('taps-100000','Quantum Miner','Complete 100,000 verified taps.','100K','{"totalTaps":100000}'),
('streak-30','Thirty Day Signal','Maintain a 30-day login streak.','30','{"loginStreak":30}'),
('referral-100','Network Architect','Invite 100 verified creators.','100','{"referrals":100}'),
('mining-1000000','Million Signal','Mine 1,000,000 lifetime AXP.','1M','{"lifetimeAxp":1000000}')
ON CONFLICT(slug) DO NOTHING;

CREATE OR REPLACE FUNCTION aion_award_progress_achievements(target_user UUID) RETURNS VOID AS $$
BEGIN
  INSERT INTO reward_user_badges(user_id,badge_id)
  SELECT target_user,b.id FROM reward_badges b JOIN reward_users u ON u.id=target_user LEFT JOIN aion_character_profiles p ON p.user_id=u.id
  WHERE b.enabled=TRUE AND (
    (b.slug='first-tap' AND COALESCE(p.total_taps,0)>=1) OR (b.slug='taps-1000' AND COALESCE(p.total_taps,0)>=1000) OR
    (b.slug='taps-100000' AND COALESCE(p.total_taps,0)>=100000) OR (b.slug='streak-30' AND u.login_streak>=30) OR
    (b.slug='referral-100' AND (SELECT COUNT(*) FROM reward_users r WHERE r.referred_by=u.id)>=100) OR
    (b.slug='mining-1000000' AND u.lifetime_axp>=1000000)
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION aion_achievement_trigger() RETURNS TRIGGER AS $$ BEGIN PERFORM aion_award_progress_achievements(NEW.user_id);RETURN NEW;END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS aion_profile_achievement_trigger ON aion_character_profiles;
CREATE TRIGGER aion_profile_achievement_trigger AFTER INSERT OR UPDATE OF total_taps ON aion_character_profiles FOR EACH ROW EXECUTE FUNCTION aion_achievement_trigger();
CREATE OR REPLACE FUNCTION aion_user_achievement_trigger() RETURNS TRIGGER AS $$ BEGIN PERFORM aion_award_progress_achievements(NEW.id);IF NEW.referred_by IS NOT NULL THEN PERFORM aion_award_progress_achievements(NEW.referred_by);END IF;RETURN NEW;END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS aion_user_achievement_trigger ON reward_users;
CREATE TRIGGER aion_user_achievement_trigger AFTER INSERT OR UPDATE OF login_streak,lifetime_axp,referred_by ON reward_users FOR EACH ROW EXECUTE FUNCTION aion_user_achievement_trigger();

INSERT INTO reward_tasks(category,task_group,title,description,icon,reward_axp,reward_xp,difficulty,enabled,repeat_mode,verification_mode,verification_config,sort_order) VALUES
('daily_login','daily','Daily login','Return to AIONEX today.','D',20,10,'easy',TRUE,'daily','system','{}',10),
('daily_mining','daily','Daily mining','Complete at least 100 verified taps today.','M',50,25,'easy',TRUE,'daily','system','{"requiredTaps":100}',20),
('referral_invite','daily','Invite a creator','Invite one verified creator today.','R',100,50,'medium',TRUE,'daily','system','{"requiredReferrals":1}',30)
ON CONFLICT DO NOTHING;

COMMIT;
