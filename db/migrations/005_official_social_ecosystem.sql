BEGIN;

ALTER TABLE reward_tasks ADD COLUMN IF NOT EXISTS external_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS reward_tasks_external_key_idx ON reward_tasks(external_key);

CREATE TABLE IF NOT EXISTS reward_social_settings (
  provider TEXT PRIMARY KEY CHECK (provider IN ('website','telegram','x','youtube')),
  url TEXT NOT NULL CHECK (url ~ '^https://'),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_social_verifications (
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram','x','youtube')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_date TIMESTAMPTZ,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  task_claim_id UUID REFERENCES reward_task_claims(id) ON DELETE SET NULL,
  verification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id,provider)
);

CREATE TABLE IF NOT EXISTS reward_social_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram','x','youtube')),
  event_type TEXT NOT NULL CHECK (event_type IN ('submitted','verified','rewarded','reset','rejected')),
  task_claim_id UUID REFERENCES reward_task_claims(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reward_social_verification_status_idx ON reward_social_verifications(provider,verified,reward_claimed);
CREATE INDEX IF NOT EXISTS reward_social_history_user_idx ON reward_social_verification_history(user_id,created_at DESC);

INSERT INTO reward_social_settings(provider,url) VALUES
 ('website','https://aionex-ai.vercel.app'),
 ('telegram','https://t.me/aionexweb3'),
 ('x','https://x.com/aionexai'),
 ('youtube','https://www.youtube.com/@AIONEXAIOfficial')
ON CONFLICT(provider) DO UPDATE SET url=EXCLUDED.url;

INSERT INTO reward_tasks(external_key,category,task_group,title,description,icon,reward_axp,reward_xp,difficulty,enabled,repeat_mode,verification_mode,verification_config,task_url,sort_order) VALUES
 ('official-telegram-join','telegram_join','social','Join AIONEX on Telegram','Join the official AIONEX Web3 Telegram channel and verify your membership.','✈',100,25,'easy',TRUE,'once','telegram','{"channelId":"@aionexweb3","botTokenEnv":"TELEGRAM_BOT_TOKEN","verificationMode":"membership"}','https://t.me/aionexweb3',10),
 ('official-x-follow','x_follow','social','Follow AIONEX on X','Follow the official AIONEX AI account. Verification requires trusted X OAuth or admin review.','𝕏',100,25,'easy',TRUE,'once','manual','{"provider":"x","verificationMode":"oauth_or_admin"}','https://x.com/aionexai',20),
 ('official-youtube-subscribe','youtube_subscribe','social','Subscribe to AIONEX on YouTube','Subscribe to the official AIONEX AI YouTube channel. Verification requires trusted Google OAuth or admin review.','▶',125,30,'easy',TRUE,'once','manual','{"provider":"youtube","verificationMode":"oauth_or_admin"}','https://www.youtube.com/@AIONEXAIOfficial',30)
ON CONFLICT(external_key) DO UPDATE SET task_url=EXCLUDED.task_url,verification_config=EXCLUDED.verification_config,title=EXCLUDED.title,description=EXCLUDED.description;

CREATE OR REPLACE VIEW reward_user_social_status AS
SELECT u.id AS user_id,
 COALESCE(BOOL_OR(v.verified) FILTER(WHERE v.provider='telegram'),FALSE) AS telegram_verified,
 COALESCE(BOOL_OR(v.verified) FILTER(WHERE v.provider='x'),FALSE) AS twitter_verified,
 COALESCE(BOOL_OR(v.verified) FILTER(WHERE v.provider='youtube'),FALSE) AS youtube_verified,
 MAX(v.verification_date) AS verification_date,
 COALESCE(BOOL_OR(v.reward_claimed),FALSE) AS reward_claimed,
 COALESCE(SUM(v.reward_amount),0)::bigint AS reward_amount
FROM reward_users u LEFT JOIN reward_social_verifications v ON v.user_id=u.id GROUP BY u.id;

COMMIT;
