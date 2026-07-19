BEGIN;

-- Complete the referral audit contract without rewriting any recovered referral data.
ALTER TABLE aion_referral_events ADD COLUMN IF NOT EXISTS referrer_axp INTEGER NOT NULL DEFAULT 0 CHECK(referrer_axp>=0);
ALTER TABLE aion_referral_events ADD COLUMN IF NOT EXISTS referred_axp INTEGER NOT NULL DEFAULT 0 CHECK(referred_axp>=0);
ALTER TABLE aion_referral_events ADD COLUMN IF NOT EXISTS referrer_xp INTEGER NOT NULL DEFAULT 0 CHECK(referrer_xp>=0);
ALTER TABLE aion_referral_events ADD COLUMN IF NOT EXISTS referred_xp INTEGER NOT NULL DEFAULT 0 CHECK(referred_xp>=0);

UPDATE aion_referral_events e SET
  referrer_axp=COALESCE((SELECT amount FROM reward_point_ledger WHERE idempotency_key='referrer:'||e.referred_user_id LIMIT 1),referrer_axp),
  referred_axp=COALESCE((SELECT amount FROM reward_point_ledger WHERE idempotency_key='referred:'||e.referred_user_id LIMIT 1),referred_axp)
WHERE referrer_axp=0 AND referred_axp=0;

INSERT INTO reward_settings(key,value) VALUES
  ('referrer_xp',50),('referred_xp',25),('achievement_default_axp',100),('achievement_default_xp',50)
ON CONFLICT(key) DO NOTHING;

ALTER TABLE reward_badges ADD COLUMN IF NOT EXISTS reward_axp INTEGER NOT NULL DEFAULT 0 CHECK(reward_axp>=0);
ALTER TABLE reward_badges ADD COLUMN IF NOT EXISTS reward_xp INTEGER NOT NULL DEFAULT 0 CHECK(reward_xp>=0);
UPDATE reward_badges SET reward_axp=CASE slug WHEN 'first-tap' THEN 20 WHEN 'taps-1000' THEN 100 WHEN 'taps-100000' THEN 1000 WHEN 'streak-30' THEN 750 WHEN 'referral-100' THEN 2000 WHEN 'mining-1000000' THEN 2500 ELSE reward_axp END,
  reward_xp=CASE slug WHEN 'first-tap' THEN 10 WHEN 'taps-1000' THEN 50 WHEN 'taps-100000' THEN 500 WHEN 'streak-30' THEN 300 WHEN 'referral-100' THEN 1000 WHEN 'mining-1000000' THEN 1250 ELSE reward_xp END
WHERE slug IN ('first-tap','taps-1000','taps-100000','streak-30','referral-100','mining-1000000');
UPDATE reward_badges SET reward_axp=COALESCE(NULLIF(reward_axp,0),(SELECT value FROM reward_settings WHERE key='achievement_default_axp'),100),
  reward_xp=COALESCE(NULLIF(reward_xp,0),(SELECT value FROM reward_settings WHERE key='achievement_default_xp'),50)
WHERE enabled=TRUE;

CREATE TABLE IF NOT EXISTS aion_season_reward_claims(
  season_id UUID NOT NULL REFERENCES aion_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  reward_config JSONB NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(season_id,user_id,reward_key)
);
CREATE TABLE IF NOT EXISTS aion_season_achievement_claims(
  achievement_id UUID NOT NULL REFERENCES aion_season_achievements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  reward_config JSONB NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(achievement_id,user_id)
);

INSERT INTO aion_seasons(key,name,starts_at,ends_at,reward_config,event_config) VALUES(
  'genesis-signal','Genesis Signal',CURRENT_DATE,CURRENT_DATE+INTERVAL '90 days',
  '{"milestones":[{"key":"signal-100","requiredXp":100,"axp":100},{"key":"signal-500","requiredXp":500,"axp":500,"xp":100},{"key":"signal-2000","requiredXp":2000,"axp":1500,"xp":500,"item":"genesis-frame","quantity":1}]}'::jsonb,
  '{"events":[{"key":"double-signal-weekend","name":"Double Signal Weekend","enabled":false}]}'::jsonb
) ON CONFLICT(key) DO NOTHING;
INSERT INTO aion_season_achievements(season_id,key,name,criteria,reward_config)
SELECT id,'season-taps-1000','Season Signal Miner','{"miningTaps":1000}'::jsonb,'{"axp":250,"xp":100}'::jsonb FROM aion_seasons WHERE key='genesis-signal'
ON CONFLICT(season_id,key) DO NOTHING;
INSERT INTO aion_season_achievements(season_id,key,name,criteria,reward_config)
SELECT id,'season-referrals-3','Season Network Builder','{"referrals":3}'::jsonb,'{"axp":500,"xp":200,"item":"network-emblem"}'::jsonb FROM aion_seasons WHERE key='genesis-signal'
ON CONFLICT(season_id,key) DO NOTHING;

-- Award each achievement once. The badge insert is the idempotency boundary.
CREATE OR REPLACE FUNCTION aion_award_progress_achievements(target_user UUID) RETURNS VOID AS $$
DECLARE unlocked RECORD; configured_xp INTEGER;
BEGIN
  SELECT COALESCE((SELECT value FROM reward_settings WHERE key='aion_xp_per_level'),500) INTO configured_xp;
  FOR unlocked IN
    WITH awarded AS (
      INSERT INTO reward_user_badges(user_id,badge_id)
      SELECT target_user,b.id FROM reward_badges b JOIN reward_users u ON u.id=target_user LEFT JOIN aion_character_profiles p ON p.user_id=u.id
      WHERE b.enabled=TRUE AND (
        (b.slug='first-mine' AND EXISTS(SELECT 1 FROM reward_point_ledger l WHERE l.user_id=u.id AND l.reason='mining')) OR
        (b.slug='miner-7' AND (SELECT COUNT(*) FROM reward_point_ledger l WHERE l.user_id=u.id AND l.reason='mining')>=7) OR
        (b.slug='referral-5' AND (SELECT COUNT(*) FROM reward_users r WHERE r.referred_by=u.id)>=5) OR
        (b.slug='level-5' AND u.level>=5) OR (b.slug='streak-7' AND u.login_streak>=7) OR (b.slug='axp-1000' AND u.lifetime_axp>=1000) OR
        (b.slug='first-tap' AND COALESCE(p.total_taps,0)>=1) OR (b.slug='taps-1000' AND COALESCE(p.total_taps,0)>=1000) OR
        (b.slug='taps-100000' AND COALESCE(p.total_taps,0)>=100000) OR (b.slug='streak-30' AND u.login_streak>=30) OR
        (b.slug='referral-100' AND (SELECT COUNT(*) FROM reward_users r WHERE r.referred_by=u.id)>=100) OR
        (b.slug='mining-1000000' AND u.lifetime_axp>=1000000)
      ) ON CONFLICT DO NOTHING RETURNING badge_id
    ) SELECT b.id,b.reward_axp,b.reward_xp FROM awarded a JOIN reward_badges b ON b.id=a.badge_id
  LOOP
    INSERT INTO reward_point_ledger(user_id,amount,xp_awarded,reason,reference_id,idempotency_key)
    VALUES(target_user,unlocked.reward_axp,unlocked.reward_xp,'achievement',unlocked.id,'achievement:'||target_user||':'||unlocked.id) ON CONFLICT DO NOTHING;
    UPDATE reward_users SET axp_balance=axp_balance+unlocked.reward_axp,lifetime_axp=lifetime_axp+unlocked.reward_axp,
      xp=xp+unlocked.reward_xp,level=1+FLOOR((xp+unlocked.reward_xp)/configured_xp::numeric)::int,updated_at=NOW() WHERE id=target_user;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Backfill AION profiles only when absent; existing balances, progression, and profile state remain untouched.
INSERT INTO aion_character_profiles(user_id,character_name,onboarding_completed,current_energy,max_energy,energy_regen_amount,energy_regen_interval_seconds,tap_power,critical_chance_bps,critical_multiplier_bps)
SELECT u.id,'AION',TRUE,s.value,s.value,1,6,1,500,20000 FROM reward_users u CROSS JOIN LATERAL (SELECT COALESCE((SELECT value FROM reward_settings WHERE key='aion_default_max_energy'),1000)::int AS value)s
ON CONFLICT(user_id) DO NOTHING;

COMMIT;
