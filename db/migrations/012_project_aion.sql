BEGIN;

CREATE TABLE IF NOT EXISTS aion_character_stages (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_level INTEGER NOT NULL CHECK (min_level >= 1),
  max_level INTEGER NOT NULL CHECK (max_level >= min_level),
  description TEXT NOT NULL,
  visual_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aion_character_profiles (
  user_id UUID PRIMARY KEY REFERENCES reward_users(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL DEFAULT 'AION' CHECK (char_length(character_name) BETWEEN 2 AND 32),
  energy_color TEXT NOT NULL DEFAULT 'cyan' CHECK (energy_color IN ('cyan','violet','emerald','amber','rose','blue')),
  eye_color TEXT NOT NULL DEFAULT 'cyan',
  aura TEXT NOT NULL DEFAULT 'core',
  background TEXT NOT NULL DEFAULT 'void',
  profile_frame TEXT NOT NULL DEFAULT 'signal',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  current_energy INTEGER NOT NULL DEFAULT 500 CHECK (current_energy >= 0),
  max_energy INTEGER NOT NULL DEFAULT 500 CHECK (max_energy BETWEEN 1 AND 1000000),
  energy_regen_amount INTEGER NOT NULL DEFAULT 1 CHECK (energy_regen_amount BETWEEN 1 AND 1000),
  energy_regen_interval_seconds INTEGER NOT NULL DEFAULT 6 CHECK (energy_regen_interval_seconds BETWEEN 1 AND 86400),
  last_energy_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tap_power INTEGER NOT NULL DEFAULT 1 CHECK (tap_power BETWEEN 1 AND 100000),
  critical_chance_bps INTEGER NOT NULL DEFAULT 500 CHECK (critical_chance_bps BETWEEN 0 AND 10000),
  critical_multiplier_bps INTEGER NOT NULL DEFAULT 20000 CHECK (critical_multiplier_bps BETWEEN 10000 AND 100000),
  total_taps BIGINT NOT NULL DEFAULT 0 CHECK (total_taps >= 0),
  highest_combo INTEGER NOT NULL DEFAULT 0 CHECK (highest_combo >= 0),
  economy_version INTEGER NOT NULL DEFAULT 1 CHECK (economy_version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (current_energy <= max_energy)
);

CREATE TABLE IF NOT EXISTS aion_tap_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  ip_hash TEXT,
  requested_taps INTEGER NOT NULL CHECK (requested_taps BETWEEN 1 AND 1000),
  accepted_taps INTEGER NOT NULL CHECK (accepted_taps BETWEEN 0 AND requested_taps),
  rejected_taps INTEGER NOT NULL CHECK (rejected_taps >= 0),
  critical_taps INTEGER NOT NULL DEFAULT 0 CHECK (critical_taps >= 0),
  reward_axp BIGINT NOT NULL DEFAULT 0 CHECK (reward_axp >= 0),
  reward_xp INTEGER NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  energy_spent INTEGER NOT NULL DEFAULT 0 CHECK (energy_spent >= 0),
  client_started_at TIMESTAMPTZ,
  client_ended_at TIMESTAMPTZ,
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','partial','rejected')),
  rejection_code TEXT,
  economy_version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS aion_economy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  axp_delta BIGINT NOT NULL DEFAULT 0,
  xp_delta BIGINT NOT NULL DEFAULT 0,
  energy_delta INTEGER NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  idempotency_key TEXT NOT NULL UNIQUE,
  economy_version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aion_user_upgrades (
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  upgrade_key TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 1000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, upgrade_key)
);

CREATE TABLE IF NOT EXISTS aion_user_inventory (
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_key)
);

CREATE TABLE IF NOT EXISTS aion_dialogues (
  key TEXT PRIMARY KEY,
  locale TEXT NOT NULL DEFAULT 'en',
  context TEXT NOT NULL,
  message TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aion_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES reward_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New signal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aion_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES aion_ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aion_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS aion_stages_level_idx ON aion_character_stages (min_level, max_level) WHERE enabled=TRUE;
CREATE INDEX IF NOT EXISTS aion_tap_batches_user_time_idx ON aion_tap_batches (user_id, server_received_at DESC);
CREATE INDEX IF NOT EXISTS aion_tap_batches_rate_idx ON aion_tap_batches (device_hash, server_received_at DESC);
CREATE INDEX IF NOT EXISTS aion_tap_batches_weekly_idx ON aion_tap_batches (server_received_at DESC, user_id) WHERE accepted_taps>0;
CREATE INDEX IF NOT EXISTS aion_economy_user_time_idx ON aion_economy_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aion_economy_type_time_idx ON aion_economy_transactions (transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS aion_ai_conversations_user_idx ON aion_ai_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS aion_ai_messages_conversation_idx ON aion_ai_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS aion_admin_audit_time_idx ON aion_admin_audit_logs (created_at DESC);

INSERT INTO aion_character_stages(key,name,min_level,max_level,description,visual_config,sort_order) VALUES
  ('core','AION Core',1,5,'A newly awakened intelligence core.','{"rings":1,"body":"core","aura":"soft"}',10),
  ('spark','AION Spark',6,15,'Energy rings and mechanical signals begin to form.','{"rings":2,"body":"spark","aura":"bright"}',20),
  ('drone','AION Drone',16,30,'A mobile AI form with propulsion and data trails.','{"rings":2,"body":"drone","aura":"trail"}',30),
  ('guardian','AION Guardian',31,50,'An armored intelligence with holographic systems.','{"rings":3,"body":"guardian","aura":"holographic"}',40),
  ('quantum','AION Quantum',51,75,'A quantum energy body surrounded by data particles.','{"rings":4,"body":"quantum","aura":"particles"}',50),
  ('ascendant','AION Ascendant',76,99,'A rare and powerful evolved intelligence.','{"rings":5,"body":"ascendant","aura":"rare"}',60),
  ('prime','AION Prime',100,1000000,'The legendary final form of AION.','{"rings":6,"body":"prime","aura":"legendary"}',70)
ON CONFLICT(key) DO NOTHING;

INSERT INTO aion_dialogues(key,locale,context,message,priority) VALUES
  ('welcome_back','en','welcome','Welcome back, Creator.',10),
  ('energy_full','en','energy_full','Our energy is fully restored.',10),
  ('level_up','en','level_up','I feel stronger. We reached a new level.',20),
  ('mission_available','en','task','A new mission is available.',10),
  ('referral_joined','en','referral','Your friend joined through your invitation.',20),
  ('power_increased','en','upgrade','Our mining power increased.',20),
  ('energy_low','en','energy_low','Energy is low. Let us recharge.',30)
ON CONFLICT(key) DO NOTHING;

INSERT INTO reward_settings(key,value) VALUES
  ('aion_economy_version',1),
  ('aion_earning_paused',0),
  ('aion_max_batch_taps',50),
  ('aion_max_taps_per_second',12),
  ('aion_energy_cost_per_tap',1),
  ('aion_default_max_energy',500),
  ('aion_energy_regen_amount',1),
  ('aion_energy_regen_interval_seconds',6),
  ('aion_base_tap_power',1),
  ('aion_tap_xp',1),
  ('aion_critical_chance_bps',500),
  ('aion_critical_multiplier_bps',20000)
ON CONFLICT(key) DO NOTHING;

INSERT INTO aion_character_profiles(user_id,character_name,onboarding_completed,current_energy,max_energy,energy_regen_amount,energy_regen_interval_seconds,tap_power,critical_chance_bps,critical_multiplier_bps)
SELECT id,'AION',TRUE,500,500,1,6,1,500,20000 FROM reward_users
ON CONFLICT(user_id) DO NOTHING;

COMMIT;
